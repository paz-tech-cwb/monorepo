import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, IsNull } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';
import {
  DEFAULT_CONFIGS,
  LifeGroupTasksReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import {
  WEEKDAY_INDEX,
  dateKeyOf,
  shiftDays,
  weekdayOf,
  zonedParts,
} from '../../life-group-attendance/meeting-day.util';
import { LifeGroupTaskAssignmentsService } from '../../life-group-tasks/life-group-task-assignments.service';
import { LifeGroupTaskNotificationsService } from '../../life-group-tasks/life-group-task-notifications.service';
import { LifeGroupTaskAssignment } from '../../life-group-tasks/entities/life-group-task-assignment.entity';
import { LifeGroupTaskSkip } from '../../life-group-tasks/entities/life-group-task-skip.entity';

/**
 * Rotating life group tasks. For every group with a fixed meeting day/time,
 * fires at `hour` (church timezone) `offset` days before a meeting:
 * - the LARGEST configured offset generates the assignments (idempotent) and
 *   notifies assignees that were not notified yet;
 * - smaller offsets only remind members who already hold a non-declined task
 *   and were not reminded yet; they never generate or re-roll.
 */
@Injectable()
export class LifeGroupTasksReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'life_group_tasks';

  private readonly logger = new Logger(LifeGroupTasksReminderEvaluator.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly tasks: LifeGroupTaskAssignmentsService,
    private readonly notifications: LifeGroupTaskNotificationsService,
  ) {}

  private resolveConfig(rule: ReminderRule): LifeGroupTasksReminderConfig {
    const defaults =
      DEFAULT_CONFIGS.life_group_tasks as LifeGroupTasksReminderConfig;
    const cfg = (rule.config ?? {}) as Partial<LifeGroupTasksReminderConfig>;
    return {
      days_before_meeting: Array.isArray(cfg.days_before_meeting)
        ? cfg.days_before_meeting
        : defaults.days_before_meeting,
      hour: typeof cfg.hour === 'number' ? cfg.hour : defaults.hour,
      title: cfg.title || defaults.title,
      message: cfg.message || defaults.message,
      reminder_title: cfg.reminder_title || defaults.reminder_title,
      reminder_message: cfg.reminder_message || defaults.reminder_message,
    };
  }

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = this.resolveConfig(rule);
    const offsets = [
      ...new Set(
        cfg.days_before_meeting.filter((n) => Number.isInteger(n) && n >= 0),
      ),
    ].sort((a, b) => b - a);
    if (offsets.length === 0) return;
    const generateOffset = offsets[0];

    const nowZoned = zonedParts(now);
    if (nowZoned.hour !== cfg.hour) return;

    const groups = await this.em
      .createQueryBuilder(LifeGroup, 'lg')
      .where('lg.meetingDay IS NOT NULL')
      .andWhere('lg.meetingTime IS NOT NULL')
      .getMany();

    let skipped = 0;
    for (const group of groups) {
      const weekday = group.meetingDay
        ? WEEKDAY_INDEX[group.meetingDay]
        : undefined;
      if (weekday === undefined || !group.meetingTime) {
        skipped++;
        continue;
      }

      for (const offset of offsets) {
        // The meeting this offset targets is `offset` calendar days from
        // today; it only applies when that day is the group's weekday.
        const meetingParts = shiftDays(nowZoned, offset);
        if (weekdayOf(meetingParts) !== weekday) continue;
        const meetingDate = dateKeyOf(meetingParts);

        try {
          await this.runForMeeting(
            group.id,
            meetingDate,
            offset,
            offset === generateOffset,
            cfg,
          );
        } catch (err: unknown) {
          // One group failing must not block the others.
          this.logger.error(
            `life_group_tasks: group ${group.id} ${meetingDate} d${offset} failed`,
            err instanceof Error ? err.stack : undefined,
          );
        }
      }
    }

    if (skipped > 0) {
      this.logger.log(
        `life_group_tasks reminder: skipped ${skipped} group(s) without a fixed meeting day/time`,
      );
    }
  }

  private async runForMeeting(
    lifeGroupId: number,
    meetingDate: string,
    offset: number,
    generates: boolean,
    cfg: LifeGroupTasksReminderConfig,
  ): Promise<void> {
    const skip = await this.em.findOne(LifeGroupTaskSkip, {
      where: { lifeGroupId, meetingDate },
    });
    if (skip) return;

    const dedupeKey = `life_group_tasks:${lifeGroupId}:${meetingDate}:d${offset}`;
    const alreadySent = await this.em.findOne(ReminderDispatchLog, {
      where: { ruleType: 'life_group_tasks', dedupeKey },
    });
    if (alreadySent) return;

    let processed: number;
    if (generates) {
      const result = await this.tasks.generateForMeeting(
        lifeGroupId,
        meetingDate,
      );
      if (result.skipped) return;
      const pending = result.assignments.filter(
        (a) => a.status === 'assigned' && a.notifiedAt === null,
      );
      for (const assignment of pending) {
        await this.notifications.notifyAssignee(
          assignment,
          assignment.user,
          cfg.title,
          cfg.message,
        );
      }
      processed = pending.length;
    } else {
      const pending = await this.em.find(LifeGroupTaskAssignment, {
        where: {
          lifeGroupId,
          meetingDate,
          status: 'assigned',
          remindedAt: IsNull(),
        },
        relations: ['user'],
      });
      for (const assignment of pending) {
        await this.notifications.remindAssignee(
          assignment,
          assignment.user,
          cfg.reminder_title,
          cfg.reminder_message,
        );
      }
      // Nothing to remind yet: leave the key unset so a later run (e.g. the
      // leader assigned manually in the meantime) can still send.
      if (pending.length === 0) return;
      processed = pending.length;
    }

    this.logger.log(
      `life_group_tasks: group ${lifeGroupId} ${meetingDate} d${offset}: ${processed} notification(s)`,
    );

    try {
      await this.em.insert(ReminderDispatchLog, {
        ruleType: 'life_group_tasks',
        dedupeKey,
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== '23505') throw err;
    }
  }
}
