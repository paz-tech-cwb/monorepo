import { Logger } from '@nestjs/common';
import { Between, EntityManager, In } from 'typeorm';
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
  zonedDateTimeToDate,
  zonedParts,
} from '../../life-group-attendance/meeting-day.util';
import { claimReminderKey, releaseReminderKey } from '../claim-dispatch-key';

const RULE_TYPE = 'life_group_attendance' as const;

/** Days after the meeting date during which a (legacy, unlinked) report still counts for that meeting. */
const REPORT_WINDOW_DAYS = 6;

const HOUR_MS = 3_600_000;
const DAY_HOURS = 24;

type FollowupAction = 'followup' | 'escalate';

/**
 * Behavior of the `life_group_attendance` rule while LIFE_GROUP_MEETING_V2 is
 * on (see life-group-meeting-v2.flag.ts):
 * - primary push at meeting start + N hours with the combined copy, claim-first
 *   (only a REGULAR attendance row counts as "recorded"; extras never do);
 * - follow-ups to leader + co-leader for a meeting that has attendance but no
 *   report, RELATIVE TO THE MEETING DATETIME (meeting date + meeting_time,
 *   hour AND minute, church timezone): first at +followup_first_after_hours,
 *   then every followup_interval_hours (defaults +24h, +48h, +72h, +96h),
 *   never beyond followup_max_days and never at/after the escalation instant;
 * - a single escalation to the sector leader and sector co-leader at
 *   +escalation_after_days * 24h (default +120h);
 * - catch-up: the scheduler ticks hourly, so a due time is honored by any tick
 *   within [due, due + followup_window_hours] (default 2h, inclusive). A due
 *   time of 21:30 is therefore sent by the 22:00 tick. The claim key per due
 *   time keeps it to one push however many ticks fall in the window.
 * Meetings are driven by attendance rows, so an extra meeting (is_extra) with
 * attendance and no report is followed up like any other, using the row's date
 * and the group's meeting_time. No attendance -> nothing here (the primary push
 * owns that gap). The "has a report" check is group-based, not author-based, so
 * a report by the leader or by the co-leader completes the reminder for both.
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
    const attendanceByGroup = await this.loadRecentAttendance(
      groups,
      cfg,
      today,
    );
    let skipped = 0;

    for (const group of groups) {
      const weekday = group.meetingDay
        ? WEEKDAY_INDEX[group.meetingDay]
        : undefined;
      const [hourPart, minutePart] = (group.meetingTime ?? '').split(':');
      const meetingHour = Number(hourPart);
      const meetingMinute = Number(minutePart ?? 0);
      if (
        weekday === undefined ||
        !group.meetingTime ||
        !Number.isInteger(meetingHour) ||
        !Number.isInteger(meetingMinute) ||
        meetingHour < 0 ||
        meetingHour > 23 ||
        meetingMinute < 0 ||
        meetingMinute > 59
      ) {
        // e.g. "25:70" would otherwise roll into the next day silently
        this.logger.warn(
          `life_group_attendance: skipping life group ${group.id}: invalid meeting_time "${group.meetingTime ?? ''}"`,
        );
        skipped++;
        continue;
      }
      try {
        await this.runPrimary(group, weekday, meetingHour, cfg, today);
        await this.runFollowups(
          group,
          attendanceByGroup.get(group.id) ?? [],
          meetingHour,
          meetingMinute,
          cfg,
          now,
        );
      } catch (err: unknown) {
        // One group's failure must not starve the others; the claim was
        // released, so a later tick retries (follow-up/escalation: the next
        // hourly ticks inside the catch-up window; primary: only the same
        // hour, as in the legacy path).
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

  /** Hours after the meeting of the last instant that can still be due, plus the window. */
  private lookbackDays(cfg: ResolvedLifeGroupAttendanceConfig): number {
    const lastFollowup = cfg.followup_max_days > 0 ? cfg.followup_max_days : 0;
    const days = Math.max(lastFollowup, cfg.escalation_after_days);
    // +1 day: the window and the meeting time can push a due instant into the next date
    return days + Math.ceil(cfg.followup_window_hours / DAY_HOURS) + 1;
  }

  /** Attendance rows (regular and extra) in the look-back range, one query per run. */
  private async loadRecentAttendance(
    groups: LifeGroup[],
    cfg: ResolvedLifeGroupAttendanceConfig,
    today: ReturnType<typeof zonedParts>,
  ): Promise<Map<number, LifeGroupAttendance[]>> {
    const byGroup = new Map<number, LifeGroupAttendance[]>();
    if (groups.length === 0) return byGroup;
    const rows = await this.em.find(LifeGroupAttendance, {
      where: {
        lifeGroupId: In(groups.map((g) => g.id)),
        meetingDate: Between(
          dateKeyOf(shiftDays(today, -this.lookbackDays(cfg))),
          dateKeyOf(today),
        ),
      },
    });
    for (const row of rows) {
      const list = byGroup.get(row.lifeGroupId) ?? [];
      list.push(row);
      byGroup.set(row.lifeGroupId, list);
    }
    return byGroup;
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
    // An extra meeting on this date does not count as the regular one.
    const attendance = await this.em.findOne(LifeGroupAttendance, {
      where: { lifeGroupId: group.id, meetingDate, isExtra: false },
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

  /**
   * Offsets (hours after the meeting) of every follow-up of a meeting:
   * first, first + interval, ... bounded by followup_max_days and by the
   * escalation instant (when enabled).
   */
  private followupOffsets(cfg: ResolvedLifeGroupAttendanceConfig): number[] {
    if (cfg.followup_max_days <= 0) return [];
    const capHours = cfg.followup_max_days * DAY_HOURS;
    const escalationHours =
      cfg.escalation_after_days > 0
        ? cfg.escalation_after_days * DAY_HOURS
        : Infinity;
    const offsets: number[] = [];
    for (
      let h = cfg.followup_first_after_hours;
      h <= capHours && h < escalationHours;
      h += cfg.followup_interval_hours
    ) {
      offsets.push(h);
    }
    return offsets;
  }

  private async runFollowups(
    group: LifeGroup,
    attendanceRows: LifeGroupAttendance[],
    meetingHour: number,
    meetingMinute: number,
    cfg: ResolvedLifeGroupAttendanceConfig,
    now: Date,
  ): Promise<void> {
    const offsets = this.followupOffsets(cfg);
    const escalationHours =
      cfg.escalation_after_days > 0 ? cfg.escalation_after_days * DAY_HOURS : 0;
    const windowMs = cfg.followup_window_hours * HOUR_MS;

    for (const attendance of attendanceRows) {
      const meetingAt = zonedDateTimeToDate(
        attendance.meetingDate,
        meetingHour,
        meetingMinute,
      ).getTime();
      /** Elapsed time since a due instant, or null when `now` is outside [due, due + window]. */
      const sinceDue = (offsetHours: number): number | null => {
        const elapsed = now.getTime() - (meetingAt + offsetHours * HOUR_MS);
        return elapsed >= 0 && elapsed <= windowMs ? elapsed : null;
      };

      let action: FollowupAction | null = null;
      let followupOffset = 0;
      if (escalationHours > 0 && sinceDue(escalationHours) !== null) {
        action = 'escalate';
      } else {
        // Latest due offset still inside its window (intervals shorter than
        // the window would otherwise send several pushes at once).
        for (const offset of offsets) {
          if (sinceDue(offset) !== null) {
            action = 'followup';
            followupOffset = offset;
          }
        }
      }
      if (!action) continue;

      const meetingDate = attendance.meetingDate;
      if (await this.hasReport(group.id, attendance.id, meetingDate)) continue;

      if (action === 'followup') {
        const recipients = uniqueUsers([group.leader, group.coLeader]);
        if (recipients.length === 0) continue;
        await this.sendClaimed(
          `life_group_meeting_followup:${group.id}:${meetingDate}:${followupOffset}h`,
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
      try {
        await this.dispatch.dispatch(notification, recipients);
      } catch (err: unknown) {
        // Do not leave an orphan `pending` row: the retry creates a new one.
        await this.em
          .update(Notification, { id: notification.id }, { status: 'failed' })
          .catch(() => undefined);
        throw err;
      }
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
