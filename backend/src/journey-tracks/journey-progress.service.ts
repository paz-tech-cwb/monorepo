import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, Not } from 'typeorm';
import { JourneyTrack } from './entities/journey-track.entity';
import { JourneyTrackStep } from './entities/journey-track-step.entity';
import { MemberJourneyStepProgress } from './entities/member-journey-step-progress.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { ScopeResolverService } from '../forms-core/services/scope-resolver.service';
import { trackKeyForRole } from './role-track-map';

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

  /**
   * Builds the member-facing progress projection for a single track, given
   * its steps and this member's progress rows. Shared by getForMember
   * (all active tracks, leader view) and getCurrentTrackForMember (the
   * single track matching the member's current role).
   */
  private buildTrackProjection(
    track: JourneyTrack,
    trackSteps: JourneyTrackStep[],
    progressByStepId: Map<number, MemberJourneyStepProgress>,
  ) {
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
        ? Math.round((completedTrackedSteps.length / trackedSteps.length) * 100)
        : 0;

    return {
      projection: {
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
      },
      trackedStepsCount: trackedSteps.length,
      allTrackedStepsComplete:
        trackedSteps.length > 0 && progressPercentage === 100,
    };
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
      return this.buildTrackProjection(track, trackSteps, progressByStepId)
        .projection;
    });
  }

  async getForMemberScoped(actor: ActorUser, memberId: number) {
    await this.assertActorCanActOnMember(actor, memberId);
    return this.getForMember(memberId);
  }

  /**
   * Member-facing "my current track" view: resolves the single journey
   * track matching the member's current role (see role-track-map.ts) rather
   * than every active track. Never throws — an unknown/untracked role or a
   * missing/inactive track simply yields no current track.
   */
  async getCurrentTrackForMember(memberId: number) {
    const noTrack = { track: null, all_steps_complete: false };

    const user = await this.entityManager.findOne(User, {
      where: { id: memberId },
    });
    if (!user) return noTrack;

    const trackKey = trackKeyForRole(user.role?.slug);
    if (!trackKey) return noTrack;

    const track = await this.entityManager.findOne(JourneyTrack, {
      where: { key: trackKey, isActive: true },
    });
    if (!track) return noTrack;

    const [trackSteps, progressRows] = await Promise.all([
      this.entityManager.find(JourneyTrackStep, {
        where: { trackId: track.id },
        order: { sortOrder: 'ASC' },
      }),
      this.entityManager.find(MemberJourneyStepProgress, {
        where: { memberId },
        relations: ['completedByUser'],
      }),
    ]);
    const progressByStepId = new Map(progressRows.map((p) => [p.stepId, p]));

    const { projection, allTrackedStepsComplete } = this.buildTrackProjection(
      track,
      trackSteps,
      progressByStepId,
    );

    return {
      track: projection,
      all_steps_complete: allTrackedStepsComplete,
    };
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
    await this.assertStepBelongsToMemberCurrentTrack(memberId, step);

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

    await this.syncRolePromotion(memberId);
  }

  /**
   * Guards against approving a step from a track the member is no longer
   * (or not yet) on. Without this, a leader with scope over the member could
   * approve steps across every track in sequence, each approveStep call
   * re-triggering syncRolePromotion and walking the member up multiple role
   * levels in one burst with no admin/pastor involvement.
   */
  private async assertStepBelongsToMemberCurrentTrack(
    memberId: number,
    step: JourneyTrackStep,
  ): Promise<void> {
    const member = await this.entityManager.findOne(User, {
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    const trackKey = trackKeyForRole(member.role?.slug);
    const currentTrack = trackKey
      ? await this.entityManager.findOne(JourneyTrack, {
          where: { key: trackKey, isActive: true },
        })
      : null;

    if (!currentTrack || currentTrack.id !== step.trackId) {
      throw new BadRequestException(
        "This step does not belong to the member's current track.",
      );
    }
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
    // Note: revocation deliberately does NOT trigger syncRolePromotion or
    // any demotion — demotion is a deliberate admin-only action (via
    // PATCH /users/:id/role), never an automatic side effect of revoking a
    // single step.

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

      await this.syncRolePromotion(userId);
    } catch (error: unknown) {
      this.logger.warn(
        `syncCourseCompletion: failed to sync course ${courseId} completion for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Best-effort auto-promotion triggered whenever a member's progress on
   * their current track's steps changes (approveStep, syncCourseCompletion).
   * Never throws — a failure here must never break the caller's primary
   * flow. Demotion is never automatic; only revokeApproval leaves this
   * unwired, by design (see the comment there).
   */
  private async syncRolePromotion(memberId: number): Promise<void> {
    try {
      const user = await this.entityManager.findOne(User, {
        where: { id: memberId },
      });
      if (!user) return;

      const currentRoleSlug = user.role?.slug;
      const trackKey = trackKeyForRole(currentRoleSlug);
      if (!trackKey || !currentRoleSlug) return;

      const track = await this.entityManager.findOne(JourneyTrack, {
        where: { key: trackKey },
      });
      if (!track || !track.promotesToRole) return;

      const trackedSteps = await this.entityManager.find(JourneyTrackStep, {
        where: { trackId: track.id, type: Not('informational') },
      });
      if (trackedSteps.length === 0) return;

      const stepIds = trackedSteps.map((s) => s.id);
      const completedCount = await this.entityManager.count(
        MemberJourneyStepProgress,
        { where: { memberId, stepId: In(stepIds) } },
      );
      if (completedCount < trackedSteps.length) return;

      // Guard against a typo'd/removed promotes_to_role before attempting
      // the promotion at all — a real lookup, not just trusting the string.
      const targetRole = await this.entityManager.findOne(Role, {
        where: { slug: track.promotesToRole },
      });
      if (!targetRole) {
        this.logger.warn(
          `syncRolePromotion: track '${trackKey}' promotes_to_role '${track.promotesToRole}' does not resolve to a real role — skipping promotion for user ${memberId}.`,
        );
        return;
      }

      // Idempotent, race-safe promotion: a single conditional UPDATE rather
      // than read-modify-write. WHERE role_id still matches the role we
      // resolved the track from, guarding against a concurrent role change
      // (or a double-fire) promoting the user twice.
      const membershipDateClause =
        track.promotesToRole === 'member'
          ? `, "membership_date" = COALESCE("membership_date", CURRENT_DATE)`
          : '';

      const result = await this.entityManager.query<[unknown[], number]>(
        `
          UPDATE "users"
          SET "role_id" = $1,
              "updated_at" = now()${membershipDateClause}
          WHERE "id" = $2
            AND "role_id" = (SELECT "id" FROM "roles" WHERE "slug" = $3)
        `,
        [targetRole.id, memberId, currentRoleSlug],
      );
      const affectedRows = result[1];

      if (affectedRows === 1) {
        this.logger.log(
          `syncRolePromotion: promoted user ${memberId} from '${currentRoleSlug}' to '${track.promotesToRole}' after completing track '${trackKey}'.`,
        );
      }
    } catch (error: unknown) {
      this.logger.warn(
        `syncRolePromotion: failed to sync role promotion for user ${memberId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
