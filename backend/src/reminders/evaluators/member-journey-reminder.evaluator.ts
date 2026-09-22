import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, LessThanOrEqual } from 'typeorm';
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
import { JourneyTrackStep } from '../../journey-tracks/entities/journey-track-step.entity';
import { MemberJourneyStepProgress } from '../../journey-tracks/entities/member-journey-step-progress.entity';
import { ROLE_TRACK_KEY } from '../../journey-tracks/role-track-map';
import { User } from '../../users/entities/user.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Adapted to the journey_tracks schema (member-journey/member_journey_stages
 * was dropped — see DropMemberJourneyStages migration). Unlike the legacy
 * member_journey_stages table, journey_track_steps/member_journey_step_progress
 * only records a row once a step is COMPLETED — there is no "assigned but
 * not yet completed" row with its own clock. As a best-effort approximation,
 * "stuck since" is measured from the member's own `updated_at` (bumped on
 * role promotion, i.e. whenever the member started their current track).
 * This is not a perfect signal, but this reminder type ships with an empty
 * `steps` config by default and is currently unused in production.
 */
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
    const steps = await this.em.find(JourneyTrackStep, {
      where: { key: In(stepKeys) },
      relations: ['track'],
    });
    if (steps.length === 0) return;

    for (const step of steps) {
      const stepCfg = cfg.steps.find((s) => s.key === step.key);
      if (!stepCfg || !step.track) continue;

      const cutoff = new Date(now.getTime() - stepCfg.days * ONE_DAY_MS);

      // Members currently on the track this step belongs to: resolve which
      // role slug(s) map to this track key and push that + the updated_at
      // cutoff into the SQL WHERE clause instead of loading every user.
      const roleSlugsForTrack = Object.entries(ROLE_TRACK_KEY)
        .filter(([, trackKey]) => trackKey === step.track.key)
        .map(([roleSlug]) => roleSlug);
      if (roleSlugsForTrack.length === 0) continue;

      const membersOnTrack = await this.em.find(User, {
        where: {
          role: { slug: In(roleSlugsForTrack) },
          updatedAt: LessThanOrEqual(cutoff),
        },
      });
      if (membersOnTrack.length === 0) continue;

      const memberIds = membersOnTrack.map((u) => u.id);
      const completedProgress = await this.em.find(MemberJourneyStepProgress, {
        where: { stepId: step.id, memberId: In(memberIds) },
      });
      const completedMemberIds = new Set(
        completedProgress.map((p) => p.memberId),
      );

      for (const user of membersOnTrack) {
        if (completedMemberIds.has(user.id)) continue;

        const dedupeKey = `journey:${user.id}:${step.key}`;
        // Nudge each (member, step) at most once. We check first and only
        // record AFTER a successful dispatch, so a failed send is retried on
        // the next tick instead of being permanently suppressed.
        const alreadySent = await this.em.findOne(ReminderDispatchLog, {
          where: { ruleType: 'member_journey', dedupeKey },
        });
        if (alreadySent) continue;

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

        // Record only after a successful dispatch; the unique index still
        // guards against a concurrent double-insert.
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
}
