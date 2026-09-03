import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import {
  EventReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import {
  Notification,
  NotificationCategory,
} from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';

const ONE_HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class EventReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'event';

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = rule.config as EventReminderConfig;
    const maxLead = Math.max(...cfg.lead_times_hours, 0);

    const upcoming = await this.em
      .createQueryBuilder(Event, 'e')
      .where('e.initial_date > :now', { now })
      .andWhere('e.initial_date <= :horizon', {
        horizon: new Date(now.getTime() + (maxLead + 1) * ONE_HOUR_MS),
      })
      .getMany();

    for (const event of upcoming) {
      for (const lead of cfg.lead_times_hours) {
        const msUntilEvent = event.initialDate.getTime() - now.getTime();
        const inWindow =
          msUntilEvent >= lead * ONE_HOUR_MS &&
          msUntilEvent < (lead + 1) * ONE_HOUR_MS;
        if (!inWindow) continue;

        const dedupeKey = `event:${event.id}:${lead}h`;
        // Skip if we already dispatched this (event, lead) window. We check
        // first and only record AFTER a successful dispatch, so a failed send
        // is retried on the next tick instead of being silently suppressed.
        const alreadySent = await this.em.findOne(ReminderDispatchLog, {
          where: { ruleType: 'event', dedupeKey },
        });
        if (alreadySent) continue;

        const users = await this.em.createQueryBuilder(User, 'u').getMany();
        const notification = await this.em.save(
          this.em.create(Notification, {
            title: cfg.title,
            message: event.title,
            deepLink: `paz://agenda/${String(event.id)}`,
            category: 'events' as NotificationCategory,
            channels: ['push'],
            segment: { type: 'all' },
            status: 'pending',
            origin: 'automatic',
          }),
        );
        await this.dispatch.dispatch(notification, users);

        // Record only after a successful dispatch. The unique index still
        // guards against a concurrent double-insert.
        try {
          await this.em.insert(ReminderDispatchLog, {
            ruleType: 'event',
            dedupeKey,
          });
        } catch (err: unknown) {
          if ((err as { code?: string }).code !== '23505') throw err;
        }
      }
    }
  }
}
