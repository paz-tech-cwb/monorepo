import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import {
  MemberJourneyReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import {
  Notification,
  NotificationCategory,
} from '../../notifications/entities/notification.entity';
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

    const stepKeys = cfg.steps.map((s) => s.key);

    const stuck = await this.em
      .createQueryBuilder(MemberJourneyStage, 's')
      .leftJoinAndSelect('s.member', 'member')
      .where('s.stage_key IN (:...steps)', { steps: stepKeys })
      .andWhere('s.completed = false')
      .getMany();

    for (const stage of stuck) {
      const stepCfg = cfg.steps.find((s) => s.key === stage.stageKey);
      if (!stepCfg) continue;

      const cutoff = new Date(now.getTime() - stepCfg.days * ONE_DAY_MS);
      if (stage.updatedAt > cutoff) continue;

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
          title: cfg.title,
          message: cfg.message,
          deepLink: 'paz://journey',
          category: 'member_journey' as NotificationCategory,
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
