import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import type { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import type {
  FormReminderEntry,
  FormReportReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import {
  Notification,
  NotificationCategory,
} from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';
import { User } from '../../users/entities/user.entity';
import { LifeGroupReport } from '../../life-group-reports/entities/life-group-report.entity';
import {
  dateKeyOf,
  shiftDays,
  weekdayOf,
  zonedParts,
} from '../../life-group-attendance/meeting-day.util';

/** Catalog slug of the weekly life-group report (the only slug that skips submitters). */
export const LIFE_GROUP_REPORTS_SLUG = 'life-group-reports';

/**
 * `YYYY-MM-DD` of the Monday that starts the current church week (America/Sao_Paulo
 * calendar, ISO week Monday..Sunday). A report counts as "this week's" when its meeting
 * `date` is on or after this day (reports cannot be dated in the future).
 */
export function churchWeekStartKey(now: Date): string {
  const today = zonedParts(now);
  const daysSinceMonday = (weekdayOf(today) + 6) % 7;
  return dateKeyOf(shiftDays(today, -daysSinceMonday));
}

@Injectable()
export class FormReportReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'form_report';

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = rule.config as FormReportReminderConfig;
    if (!cfg.forms?.length) return;

    for (const entry of cfg.forms) {
      if (now.getDay() !== entry.weekday || now.getHours() !== entry.hour) {
        continue;
      }
      await this.runEntry(entry, now);
    }
  }

  private async runEntry(entry: FormReminderEntry, now: Date): Promise<void> {
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    const dedupeKey = `form_report:${entry.form_slug}:${periodStart.toISOString().slice(0, 10)}`;

    try {
      await this.em.insert(ReminderDispatchLog, {
        ruleType: 'form_report',
        dedupeKey,
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') return; // already sent this period
      throw err;
    }

    const targets = await this.em
      .createQueryBuilder(User, 'u')
      .leftJoinAndSelect('u.role', 'role')
      .where('role.slug IN (:...roles)', { roles: entry.roles })
      .getMany();

    // Only the weekly life-group report is a "did you submit yet" nag: leaders who already
    // reported for this church week are not reminded. Other slugs keep notifying every target.
    const recipients =
      entry.form_slug === LIFE_GROUP_REPORTS_SLUG
        ? await this.withoutThisWeeksSubmitters(targets, now)
        : targets;

    if (recipients.length === 0) return;

    const notification = await this.em.save(
      this.em.create(Notification, {
        title: entry.title,
        message: entry.message,
        deepLink: `paz://form/${entry.form_slug}`,
        category: 'forms' as NotificationCategory,
        channels: ['push'],
        segment: { type: 'filtered', filters: { roles: entry.roles } },
        status: 'pending',
        origin: 'automatic',
      }),
    );
    await this.dispatch.dispatch(notification, recipients);
  }

  /**
   * Drops users who submitted (`submitted_by`) a non-deleted life-group report whose meeting
   * date falls in the current church week (Monday 00:00 America/Sao_Paulo up to `now`).
   */
  private async withoutThisWeeksSubmitters(
    targets: User[],
    now: Date,
  ): Promise<User[]> {
    const rows = await this.em
      .createQueryBuilder(LifeGroupReport, 'r')
      .innerJoin('r.submittedBy', 's')
      .select('s.id', 'id')
      .distinct(true)
      .where('r.date >= :weekStart', { weekStart: churchWeekStartKey(now) })
      .andWhere('s.id IN (:...ids)', { ids: targets.map((t) => t.id) })
      .getRawMany<{ id: number | string }>();
    const submitted = new Set(rows.map((row) => Number(row.id)));
    return targets.filter((t) => !submitted.has(Number(t.id)));
  }
}
