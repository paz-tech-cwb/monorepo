import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { JourneyTrack } from './entities/journey-track.entity';
import { JourneyTrackStep } from './entities/journey-track-step.entity';
import { MemberJourneyStepProgress } from './entities/member-journey-step-progress.entity';
import { User } from '../users/entities/user.entity';
import { ScopeResolverService } from '../forms-core/services/scope-resolver.service';

type ActorUser = { id: number; role?: { slug?: string } | null };

@Injectable()
export class JourneyProgressService {
  private readonly logger = new Logger(JourneyProgressService.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly scopeResolverService: ScopeResolverService,
  ) {}

  /**
   * Non-admin/pastor leadership roles (life_group_leader, sector_leader,
   * area_leader) are normally within their own scope (e.g. a life group
   * leader is a member of the group they lead), so the scope check alone
   * would let them approve their own manual-approval steps — exactly the
   * self-approval this workflow exists to prevent. Admins/pastors are
   * exempted since self-approval by them isn't the abuse case here.
   */
  private assertActorNotSelfApproving(actor: ActorUser, memberId: number) {
    const slug = actor.role?.slug;
    if (slug === 'admin' || slug === 'pastor') return;
    if (actor.id === memberId) {
      throw new ForbiddenException(
        'You cannot approve your own journey steps.',
      );
    }
  }

  private async assertActorCanActOnMember(
    actor: ActorUser,
    memberId: number,
  ): Promise<void> {
    const slug = actor.role?.slug;
    if (slug === 'admin' || slug === 'pastor') return;

    const member = await this.entityManager.findOne(User, {
      where: { id: memberId },
      relations: ['sector', 'sector.area', 'lifeGroups'],
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    const scope = await this.scopeResolverService.resolve(actor.id);
    if (scope.unrestricted) return;

    const memberAreaId = member.sector?.area?.id;
    const memberSectorId = member.sector?.id;
    const memberLifeGroupIds = (member.lifeGroups ?? []).map((lg) => lg.id);

    const hasAccess =
      (memberAreaId !== undefined && scope.areaIds.includes(memberAreaId)) ||
      (memberSectorId !== undefined &&
        scope.sectorIds.includes(memberSectorId)) ||
      memberLifeGroupIds.some((id) => scope.lifeGroupIds.includes(id));

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this member journey.',
      );
    }
  }

  async getForMember(memberId: number) {
    const [tracks, progressRows] = await Promise.all([
      this.entityManager.find(JourneyTrack, {
        where: { isActive: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
      this.entityManager.find(MemberJourneyStepProgress, {
        where: { memberId },
        relations: ['completedByUser'],
      }),
    ]);

    const trackIds = tracks.map((t) => t.id);
    const steps = trackIds.length
      ? await this.entityManager.find(JourneyTrackStep, {
          where: { trackId: In(trackIds) },
          order: { sortOrder: 'ASC' },
        })
      : [];

    const progressByStepId = new Map(progressRows.map((p) => [p.stepId, p]));

    return tracks.map((track) => {
      const trackSteps = steps.filter((s) => s.trackId === track.id);
      const stepsWithProgress = trackSteps.map((step) => {
        const progress = progressByStepId.get(step.id);
        return {
          id: step.id,
          key: step.key,
          sort_order: step.sortOrder,
          type: step.type,
          title: step.title,
          description: step.description ?? null,
          course_id: step.courseId ?? null,
          external_url: step.externalUrl ?? null,
          completed: !!progress,
          completed_at: progress?.completedAt ?? null,
          source: progress?.source ?? null,
          completed_by_name: progress?.completedByUser?.name ?? null,
        };
      });

      // Informational steps are display-only and excluded from the
      // completion denominator.
      const trackedSteps = stepsWithProgress.filter(
        (s) => s.type !== 'informational',
      );
      const completedTrackedSteps = trackedSteps.filter((s) => s.completed);
      const progressPercentage =
        trackedSteps.length > 0
          ? Math.round(
              (completedTrackedSteps.length / trackedSteps.length) * 100,
            )
          : 0;

      return {
        track: {
          id: track.id,
          key: track.key,
          title: track.title,
          description: track.description ?? null,
          eligibility_text: track.eligibilityText ?? null,
          sort_order: track.sortOrder,
        },
        steps: stepsWithProgress,
        progress_percentage: progressPercentage,
      };
    });
  }

  async getForMemberScoped(actor: ActorUser, memberId: number) {
    await this.assertActorCanActOnMember(actor, memberId);
    return this.getForMember(memberId);
  }

  async approveStep(
    actor: ActorUser,
    memberId: number,
    stepId: number,
    note?: string | null,
  ): Promise<void> {
    const step = await this.entityManager.findOne(JourneyTrackStep, {
      where: { id: stepId },
    });
    if (!step) {
      throw new NotFoundException(
        `Journey track step with ID ${stepId} not found`,
      );
    }
    if (step.type !== 'manual_approval') {
      throw new BadRequestException(
        `Step ${stepId} is not a manual_approval step and cannot be approved this way.`,
      );
    }

    await this.assertActorCanActOnMember(actor, memberId);
    this.assertActorNotSelfApproving(actor, memberId);

    await this.entityManager
      .createQueryBuilder()
      .insert()
      .into(MemberJourneyStepProgress)
      .values({
        memberId,
        stepId,
        completedAt: new Date(),
        source: 'manual_approval',
        completedByUserId: actor.id,
        note: note ?? null,
      })
      .orIgnore()
      .execute();
  }

  async revokeApproval(
    actor: ActorUser,
    memberId: number,
    stepId: number,
  ): Promise<void> {
    await this.assertActorCanActOnMember(actor, memberId);
    // Applying the same self-action guard as approveStep for consistency:
    // revoking one's own approval is less sensitive (it removes a benefit
    // rather than granting one), but there's no legitimate reason for a
    // non-admin/pastor leader to be modifying their own progress record
    // either, so we keep the rule uniform rather than carve out an exception.
    this.assertActorNotSelfApproving(actor, memberId);

    const progress = await this.entityManager.findOne(
      MemberJourneyStepProgress,
      { where: { memberId, stepId } },
    );
    if (!progress) return;

    if (progress.source !== 'manual_approval') {
      throw new BadRequestException(
        `Progress for step ${stepId} was not a manual approval and cannot be revoked this way.`,
      );
    }

    await this.entityManager.remove(MemberJourneyStepProgress, progress);
  }

  /**
   * Best-effort sync triggered by course completion (questionnaire pass or,
   * for questionnaire-less courses, the final lesson crossing the watch
   * threshold). Fans out to every journey_track_step referencing this course
   * across every track. Never throws — a failure here must never break the
   * caller's primary flow (certificate issuance / progress reporting).
   */
  async syncCourseCompletion(userId: number, courseId: string): Promise<void> {
    try {
      const steps = await this.entityManager.find(JourneyTrackStep, {
        where: { courseId, type: 'course_completion' },
      });
      if (steps.length === 0) return;

      for (const step of steps) {
        await this.entityManager
          .createQueryBuilder()
          .insert()
          .into(MemberJourneyStepProgress)
          .values({
            memberId: userId,
            stepId: step.id,
            completedAt: new Date(),
            source: 'course_completion',
            completedByUserId: null,
            note: null,
          })
          .orIgnore()
          .execute();
      }
    } catch (error: unknown) {
      this.logger.warn(
        `syncCourseCompletion: failed to sync course ${courseId} completion for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
