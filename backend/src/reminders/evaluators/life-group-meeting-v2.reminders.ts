import { Logger } from '@nestjs/common';
import { Between, EntityManager } from 'typeorm';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { resolveLifeGroupAttendanceConfig } from '../types/reminder-config';
import type { ResolvedLifeGroupAttendanceConfig } from '../types/reminder-config';
import {
  Notification,
  NotificationCategory,
} from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { User } from '../../users/entities/user.entity';
import { LifeGroupAttendance } from '../../life-group-attendance/entities/life-group-attendance.entity';
import { LifeGroupReport } from '../../life-group-reports/entities/life-group-report.entity';
import {
  WEEKDAY_INDEX,
  dateKeyOf,
  shiftDays,
  weekdayOf,
  zonedParts,
} from '../../life-group-attendance/meeting-day.util';
import { claimReminderKey, releaseReminderKey } from '../claim-dispatch-key';

const RULE_TYPE = 'life_group_attendance' as const;

/** Days after the meeting date during which a (legacy, unlinked) report still counts for that meeting. */
const REPORT_WINDOW_DAYS = 6;

type FollowupAction = 'followup' | 'escalate';

/**
 * Behavior of the `life_group_attendance` rule while LIFE_GROUP_MEETING_V2 is
 * on (see life-group-meeting-v2.flag.ts):
 * - primary push at meeting start + N hours with the combined copy, claim-first;
 * - at `followup_hour` (Sao Paulo), a follow-up to leader + co-leader for a past
 *   meeting that has attendance but no report, repeated every
 *   `followup_interval_days` up to `followup_max_days`;
 * - on day `escalation_after_days`, a single push to the sector leader and
 *   sector co-leader (the daily follow-ups stop before that day).
 * Everything is computed in the church timezone via the shared zoned helpers.
 */
export class LifeGroupMeetingV2Reminders {
  private readonly logger = new Logger(LifeGroupMeetingV2Reminders.name);

  constructor(
    private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = resolveLifeGroupAttendanceConfig(rule.config);
    const groups = await this.em
      .createQueryBuilder(LifeGroup, 'lg')
      .leftJoinAndSelect('lg.leader', 'leader')
      .leftJoinAndSelect('lg.coLeader', 'coLeader')
      .leftJoinAndSelect('lg.sector', 'sector')
      .leftJoinAndSelect('sector.leader', 'sectorLeader')
      .leftJoinAndSelect('sector.coLeader', 'sectorCoLeader')
      .where('lg.meetingDay IS NOT NULL')
      .andWhere('lg.meetingTime IS NOT NULL')
      .getMany();

    const today = zonedParts(now);
    let skipped = 0;

    for (const group of groups) {
      const weekday = group.meetingDay
        ? WEEKDAY_INDEX[group.meetingDay]
        : undefined;
      const meetingHour = group.meetingTime
        ? Number(group.meetingTime.split(':')[0])
        : Number.NaN;
      if (weekday === undefined || Number.isNaN(meetingHour)) {
        skipped++;
        continue;
      }
      try {
        await this.runPrimary(group, weekday, meetingHour, cfg, today);
        if (today.hour === cfg.followup_hour) {
          await this.runFollowups(group, weekday, cfg, today);
        }
      } catch (err: unknown) {
        // One group's failure must not starve the others; the claim was
        // released, so the next tick retries.
        this.logger.error(
          `life_group_attendance v2 failed for life group ${group.id}`,
          err as Error,
        );
      }
    }

    if (skipped > 0) {
      this.logger.log(
        `life_group_attendance reminder: skipped ${skipped} group(s) without a fixed meeting day/time`,
      );
    }
  }

  private async runPrimary(
    group: LifeGroup,
    weekday: number,
    meetingHour: number,
    cfg: ResolvedLifeGroupAttendanceConfig,
    today: ReturnType<typeof zonedParts>,
  ): Promise<void> {
    // meeting_time + hoursAfter can cross midnight: weekday and date shift
    // together (same arithmetic as the legacy path).
    const totalHour = meetingHour + cfg.hours_after_meeting_start;
    const dayOffset = Math.floor(totalHour / 24);
    const reminderHour = ((totalHour % 24) + 24) % 24;
    const reminderWeekday = (((weekday + dayOffset) % 7) + 7) % 7;
    if (weekdayOf(today) !== reminderWeekday) return;
    if (today.hour !== reminderHour) return;

    const meetingDate = dateKeyOf(shiftDays(today, -dayOffset));
    // Attendance missing -> the primary push. Attendance present (with or
    // without the report) -> no primary push: the follow-up covers the report.
    const attendance = await this.em.findOne(LifeGroupAttendance, {
      where: { lifeGroupId: group.id, meetingDate },
    });
    if (attendance) return;

    const recipients = uniqueUsers([group.leader, group.coLeader]);
    if (recipients.length === 0) return;

    await this.sendClaimed(
      `life_group_attendance:${group.id}:${meetingDate}`,
      recipients,
      {
        title: cfg.meeting_title,
        message: cfg.meeting_message,
        deepLink: `paz://presenca/${group.id}/${meetingDate}`,
      },
    );
  }

  private async runFollowups(
    group: LifeGroup,
    weekday: number,
    cfg: ResolvedLifeGroupAttendanceConfig,
    today: ReturnType<typeof zonedParts>,
  ): Promise<void> {
    const escalationOn = cfg.escalation_after_days > 0;
    const lastFollowupDay =
      cfg.followup_max_days > 0
        ? escalationOn
          ? Math.min(cfg.followup_max_days, cfg.escalation_after_days - 1)
          : cfg.followup_max_days
        : 0;
    const horizon = Math.max(lastFollowupDay, cfg.escalation_after_days);

    for (let day = 1; day <= horizon; day++) {
      const meetingParts = shiftDays(today, -day);
      if (weekdayOf(meetingParts) !== weekday) continue;

      let action: FollowupAction | null = null;
      if (escalationOn && day === cfg.escalation_after_days) {
        action = 'escalate';
      } else if (
        day <= lastFollowupDay &&
        (day - 1) % cfg.followup_interval_days === 0
      ) {
        action = 'followup';
      }
      if (!action) continue;

      const meetingDate = dateKeyOf(meetingParts);
      const attendance = await this.em.findOne(LifeGroupAttendance, {
        where: { lifeGroupId: group.id, meetingDate },
      });
      // No attendance: the meeting is not proven to have happened and the
      // primary push owns that gap.
      if (!attendance) continue;
      if (await this.hasReport(group.id, attendance.id, meetingDate)) continue;

      if (action === 'followup') {
        const recipients = uniqueUsers([group.leader, group.coLeader]);
        if (recipients.length === 0) continue;
        await this.sendClaimed(
          `life_group_meeting_followup:${group.id}:${meetingDate}:${day}`,
          recipients,
          {
            title: cfg.followup_title,
            message: cfg.followup_message,
            deepLink: `paz://presenca/${group.id}/${meetingDate}`,
          },
        );
      } else {
        const recipients = uniqueUsers([
          group.sector?.leader,
          group.sector?.coLeader,
        ]);
        if (recipients.length === 0) {
          this.logger.warn(
            `life_group_attendance escalation: life group ${group.id} has no sector leader/co-leader to notify for ${meetingDate}`,
          );
          continue;
        }
        const [, month, dayOfMonth] = meetingDate.split('-');
        const fill = (text: string) =>
          text
            .replaceAll('{group}', group.name)
            .replaceAll('{date}', `${dayOfMonth}/${month}`);
        await this.sendClaimed(
          `life_group_meeting_escalation:${group.id}:${meetingDate}`,
          recipients,
          {
            title: fill(cfg.escalation_title),
            message: fill(cfg.escalation_message),
            deepLink: `paz://lifegroup/${group.id}`,
          },
        );
      }
    }
  }

  /**
   * A report counts for the meeting when it is linked to the attendance row or
   * dated within [meeting date, meeting date + 6] (legacy reports are unlinked
   * and are usually dated the Sunday after). Soft-deleted rows are excluded by
   * TypeORM.
   */
  private hasReport(
    lifeGroupId: number,
    attendanceId: string,
    meetingDate: string,
  ): Promise<boolean> {
    const [y, m, d] = meetingDate.split('-').map(Number);
    const windowEnd = dateKeyOf(
      shiftDays({ year: y, month: m, day: d }, REPORT_WINDOW_DAYS),
    );
    return this.em.exists(LifeGroupReport, {
      where: [
        { lifeGroupId, attendanceId },
        { lifeGroupId, date: Between(meetingDate, windowEnd) },
      ],
    });
  }

  /** Claim-first send: false when another run already claimed the key. */
  private async sendClaimed(
    dedupeKey: string,
    recipients: User[],
    content: { title: string; message: string; deepLink: string },
  ): Promise<boolean> {
    if (!(await claimReminderKey(this.em, RULE_TYPE, dedupeKey))) return false;
    try {
      const notification = await this.em.save(
        this.em.create(Notification, {
          title: content.title,
          message: content.message,
          deepLink: content.deepLink,
          category: 'life_group_attendance' as NotificationCategory,
          channels: ['push'],
          segment: {
            type: 'filtered',
            filters: { user_ids: recipients.map((u) => u.id) },
          },
          status: 'pending',
          origin: 'automatic',
        }),
      );
      await this.dispatch.dispatch(notification, recipients);
      return true;
    } catch (err: unknown) {
      await releaseReminderKey(this.em, RULE_TYPE, dedupeKey);
      throw err;
    }
  }
}

function uniqueUsers(users: Array<User | null | undefined>): User[] {
  const seen = new Set<number>();
  const result: User[] = [];
  for (const user of users) {
    if (!user || seen.has(user.id)) continue;
    seen.add(user.id);
    result.push(user);
  }
  return result;
}
