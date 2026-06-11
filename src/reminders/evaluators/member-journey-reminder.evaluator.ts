import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import {
  MemberJourneyReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { MemberJourneyStage } from '../../member-journey/entities/member-journey-stage.entity';
import { User } from '../../users/entities/user.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MemberJourneyReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'member_journey';

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = rule.config as MemberJourneyReminderConfig;
    if (!cfg.steps || cfg.steps.length === 0) return;

    const cutoff = new Date(now.getTime() - cfg.threshold_days * ONE_DAY_MS);

    const stuck = await this.em
      .createQueryBuilder(MemberJourneyStage, 's')
      .leftJoinAndSelect('s.member', 'member')
      .where('s.stage_key IN (:...steps)', { steps: cfg.steps })
      .andWhere('s.completed = false')
      .andWhere('s.updated_at <= :cutoff', { cutoff })
      .getMany();

    for (const stage of stuck) {
      const dedupeKey = `journey:${stage.memberId}:${stage.stageKey}`;
      // Nudge each (member, stage) at most once. We check first and only
      // record AFTER a successful dispatch, so a failed send is retried on the
      // next tick instead of being permanently suppressed.
      const alreadySent = await this.em.findOne(ReminderDispatchLog, {
        where: { ruleType: 'member_journey', dedupeKey },
      });
      if (alreadySent) continue;

      const user = await this.em.findOne(User, {
        where: { id: stage.memberId },
      });
      if (!user) continue;

      const notification = await this.em.save(
        this.em.create(Notification, {
          title: 'Continue sua jornada',
          message: 'Há um próximo passo esperando por você na sua jornada.',
          category: 'member_journey',
          channels: ['push'],
          segment: { type: 'filtered', filters: {} },
          status: 'pending',
          origin: 'automatic',
        }),
      );
      await this.dispatch.dispatch(notification, [user]);

      // Record only after a successful dispatch; the unique index still guards
      // against a concurrent double-insert.
      try {
        await this.em.insert(ReminderDispatchLog, {
          ruleType: 'member_journey',
          dedupeKey,
        });
      } catch (err: unknown) {
        if ((err as { code?: string }).code !== '23505') throw err;
      }
    }
  }
}
