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

    if (targets.length === 0) return;

    const notification = await this.em.save(
      this.em.create(Notification, {
        title: entry.title,
        message: entry.message,
        deepLink: 'paz://formularios',
        category: 'forms' as NotificationCategory,
        channels: ['push'],
        segment: { type: 'filtered', filters: { roles: entry.roles } },
        status: 'pending',
        origin: 'automatic',
      }),
    );
    await this.dispatch.dispatch(notification, targets);
  }
}
