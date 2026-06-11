import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import {
  EventReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import { Notification } from '../../notifications/entities/notification.entity';
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
        try {
          await this.em.insert(ReminderDispatchLog, {
            ruleType: 'event',
            dedupeKey,
          });
        } catch (err: unknown) {
          if ((err as { code?: string }).code === '23505') continue; // already sent
          throw err;
        }

        const users = await this.em.createQueryBuilder(User, 'u').getMany();
        const notification = await this.em.save(
          this.em.create(Notification, {
            title: `Lembrete: ${event.title}`,
            message: `O evento "${event.title}" começa em breve.`,
            category: 'events',
            channels: ['push'],
            segment: { type: 'all' },
            status: 'pending',
            origin: 'automatic',
          }),
        );
        await this.dispatch.dispatch(notification, users);
      }
    }
  }
}
