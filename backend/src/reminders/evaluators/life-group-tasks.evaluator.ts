import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, IsNull } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';
import {
  LifeGroupTasksReminderConfig,
  ReminderRuleType,
  resolveLifeGroupTasksConfig,
} from '../types/reminder-config';
import {
  claimDispatchKey,
  releaseDispatchKey,
} from '../../life-group-tasks/dispatch-claim';
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
    return resolveLifeGroupTasksConfig(rule.config);
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
    // Cheap pre-check (avoids a failing INSERT on every tick once sent).
    const alreadySent = await this.em.findOne(ReminderDispatchLog, {
      where: { ruleType: 'life_group_tasks', dedupeKey },
    });
    if (alreadySent) return;

    // Claim first (multi-instance safety): whoever inserts the dispatch row
    // owns this (group, date, offset); a unique violation means someone else
    // already did. The claim is released when nothing was sent or a send
    // fails, so the next tick retries.
    if (!(await claimDispatchKey(this.em, dedupeKey))) return;

    let keepClaim = false;
    try {
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
        // notifyAssignee also claims each assignment (notified_at IS NULL),
        // so a manual generate that already pushed them is not repeated.
        let sent = 0;
        let failed = 0;
        for (const assignment of pending) {
          try {
            await this.notifications.notifyAssignee(
              assignment,
              assignment.user,
              cfg.title,
              cfg.message,
            );
            sent++;
          } catch (err: unknown) {
            failed++;
            this.logger.error(
              `life_group_tasks: notify assignment ${assignment.id} failed`,
              err instanceof Error ? err.stack : undefined,
            );
          }
        }
        // Release the group claim only when nothing at all went out, so the
        // next tick retries; per-assignment claims dedupe the rest.
        if (pending.length > 0 && sent === 0 && failed > 0) return;
        processed = sent;
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
        // Nothing to remind yet: release the claim so a later run (e.g. the
        // leader assigned manually in the meantime) can still send.
        if (pending.length === 0) return;
        let sent = 0;
        let failed = 0;
        for (const assignment of pending) {
          try {
            await this.notifications.remindAssignee(
              assignment,
              assignment.user,
              cfg.reminder_title,
              cfg.reminder_message,
            );
            sent++;
          } catch (err: unknown) {
            failed++;
            this.logger.error(
              `life_group_tasks: remind assignment ${assignment.id} failed`,
              err instanceof Error ? err.stack : undefined,
            );
          }
        }
        if (sent === 0 && failed > 0) return;
        processed = sent;
      }

      keepClaim = true;
      this.logger.log(
        `life_group_tasks: group ${lifeGroupId} ${meetingDate} d${offset}: ${processed} notification(s)`,
      );
    } finally {
      if (!keepClaim) await releaseDispatchKey(this.em, dedupeKey);
    }
  }
}
