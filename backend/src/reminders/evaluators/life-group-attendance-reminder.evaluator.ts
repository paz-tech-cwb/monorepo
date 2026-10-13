import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import {
  LifeGroupAttendanceReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import {
  Notification,
  NotificationCategory,
} from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { User } from '../../users/entities/user.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';
import { LifeGroupAttendance } from '../../life-group-attendance/entities/life-group-attendance.entity';
import {
  WEEKDAY_INDEX,
  dateKeyOf,
  shiftDays,
  weekdayOf,
  zonedParts,
} from '../../life-group-attendance/meeting-day.util';
import { isLifeGroupMeetingV2Enabled } from '../life-group-meeting-v2.flag';
import { LifeGroupMeetingV2Reminders } from './life-group-meeting-v2.reminders';

@Injectable()
export class LifeGroupAttendanceReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'life_group_attendance';

  private readonly logger = new Logger(
    LifeGroupAttendanceReminderEvaluator.name,
  );

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    // LIFE_GROUP_MEETING_V2 (default off) switches to the merged attendance +
    // report reminders; with it off the legacy path below runs untouched.
    if (isLifeGroupMeetingV2Enabled()) {
      await new LifeGroupMeetingV2Reminders(this.em, this.dispatch).run(
        rule,
        now,
      );
      return;
    }
    await this.runLegacy(rule, now);
  }

  private async runLegacy(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = rule.config as LifeGroupAttendanceReminderConfig;
    const hoursAfter = cfg.hours_after_meeting_start ?? 2;

    const groups = await this.em
      .createQueryBuilder(LifeGroup, 'lg')
      .leftJoinAndSelect('lg.leader', 'leader')
      .leftJoinAndSelect('lg.coLeader', 'coLeader')
      .where('lg.meetingDay IS NOT NULL')
      .andWhere('lg.meetingTime IS NOT NULL')
      .getMany();

    let skipped = 0;

    const nowZoned = zonedParts(now);
    const nowWeekday = weekdayOf(nowZoned);

    for (const group of groups) {
      const weekday = group.meetingDay
        ? WEEKDAY_INDEX[group.meetingDay]
        : undefined;
      if (weekday === undefined || !group.meetingTime) {
        skipped++;
        continue;
      }

      const [hourStr] = group.meetingTime.split(':');
      const meetingHour = Number(hourStr);
      if (Number.isNaN(meetingHour)) {
        skipped++;
        continue;
      }

      // meeting_time + hoursAfter can cross midnight (e.g. a 22:00 meeting
      // with hoursAfter=2 reminds at 00:00 the NEXT calendar day/weekday),
      // so both the reminder hour and the weekday it fires on must account
      // for the day rollover together.
      const totalHour = meetingHour + hoursAfter;
      const dayOffset = Math.floor(totalHour / 24);
      const reminderHour = ((totalHour % 24) + 24) % 24;
      const reminderWeekday = (((weekday + dayOffset) % 7) + 7) % 7;

      if (nowWeekday !== reminderWeekday) continue;
      if (nowZoned.hour !== reminderHour) continue;

      const meetingDateParts = shiftDays(nowZoned, -dayOffset);
      const meetingDateKey = dateKeyOf(meetingDateParts);

      const alreadyRecorded = await this.em.findOne(LifeGroupAttendance, {
        where: { lifeGroupId: group.id, meetingDate: meetingDateKey },
      });
      if (alreadyRecorded) continue;

      const dedupeKey = `life_group_attendance:${group.id}:${meetingDateKey}`;
      const alreadySent = await this.em.findOne(ReminderDispatchLog, {
        where: { ruleType: 'life_group_attendance', dedupeKey },
      });
      if (alreadySent) continue;

      const recipients: User[] = [group.leader, group.coLeader].filter(
        (u): u is User => !!u,
      );
      if (recipients.length === 0) continue;

      const notification = await this.em.save(
        this.em.create(Notification, {
          title: cfg.title,
          message: cfg.message,
          deepLink: `paz://presenca/${group.id}/${meetingDateKey}`,
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

      try {
        await this.em.insert(ReminderDispatchLog, {
          ruleType: 'life_group_attendance',
          dedupeKey,
        });
      } catch (err: unknown) {
        if ((err as { code?: string }).code !== '23505') throw err;
      }
    }

    if (skipped > 0) {
      this.logger.log(
        `life_group_attendance reminder: skipped ${skipped} group(s) without a fixed meeting day/time`,
      );
    }
  }
}
