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

// Maps the Portuguese weekday labels used by admin-ui/mobile life group
// forms (see admin-ui MEETING_DAYS) to JS Date#getDay() indices. Any life
// group whose meeting_day isn't one of these fixed weekdays (i.e. "Sem dia
// fixo") — or has no meeting_time — has no computable meeting start and is
// skipped by this evaluator rather than guessed at.
const WEEKDAY_INDEX: Record<string, number> = {
  Domingo: 0,
  'Segunda-feira': 1,
  'Terça-feira': 2,
  'Quarta-feira': 3,
  'Quinta-feira': 4,
  'Sexta-feira': 5,
  Sábado: 6,
};

// Life group meeting_day/meeting_time are entered by leaders in the
// church's local timezone, and LifeGroupAttendanceService persists
// meeting_date as a local calendar date. The reminder server always runs in
// UTC, so all weekday/hour/date-key computation below must be done in the
// church's timezone rather than relying on Date's UTC-based getDay()/
// getHours()/toISOString(), or every check silently drifts by the UTC
// offset (and wraps to the wrong calendar day for evening meetings).
const CHURCH_TIME_ZONE = 'America/Sao_Paulo';

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

function zonedParts(date: Date, timeZone = CHURCH_TIME_ZONE): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    map[part.type] = part.value;
  }
  // Some locales render midnight as "24" with hour12: false.
  const hour = Number(map.hour) % 24;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
  };
}

// A pure calendar-day computation (weekday of a Y/M/D triple, or a Y/M/D
// triple shifted by N days) is timezone-agnostic, so it's safe to do via
// UTC-anchored Date math regardless of the server's runtime timezone.
function weekdayOf(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function dateKeyOf(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>): string {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return d.toISOString().slice(0, 10);
}

function shiftDays(
  parts: Pick<ZonedParts, 'year' | 'month' | 'day'>,
  offsetDays: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

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
