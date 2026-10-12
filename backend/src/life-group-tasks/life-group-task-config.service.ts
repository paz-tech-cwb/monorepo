import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import {
  assertCanAccessLifeGroup,
  assertValidDateString,
  findLifeGroupOrThrow,
  TaskActor,
} from './life-group-task-access';
import { LifeGroupTaskRosterService } from './life-group-task-roster.service';
import { LifeGroupTaskGroupSetting } from './entities/life-group-task-group-setting.entity';
import {
  GRANDFATHERED_REASON,
  LifeGroupTaskMemberSetting,
} from './entities/life-group-task-member-setting.entity';
import { LifeGroupTaskOverride } from './entities/life-group-task-override.entity';
import { LifeGroupTaskSkip } from './entities/life-group-task-skip.entity';
import { LifeGroupTaskTemplate } from './entities/life-group-task-template.entity';
import {
  TaskMemberEntryDto,
  TaskOverrideEntryDto,
} from './dto/life-group-task-config.dto';

function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.trim() === '' ? null : value;
}

/**
 * Per-group configuration: template overrides, per-member eligibility,
 * group settings and skipped dates. Every method requires access to the
 * group (scope, or leader/co-leader fallback).
 */
@Injectable()
export class LifeGroupTaskConfigService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly roster: LifeGroupTaskRosterService,
  ) {}

  private async loadAccessibleGroup(
    lifeGroupId: number,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    const lifeGroup = await findLifeGroupOrThrow(this.em, lifeGroupId);
    assertCanAccessLifeGroup(lifeGroup, scope, actor);
    return lifeGroup;
  }

  // ---- overrides -------------------------------------------------------

  private async buildOverrides(lifeGroupId: number) {
    const templates = await this.em.find(LifeGroupTaskTemplate, {
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const overrides = await this.em.find(LifeGroupTaskOverride, {
      where: { lifeGroupId },
    });
    const byTemplate = new Map(overrides.map((o) => [o.templateId, o]));
    return templates.map((template) => {
      const override = byTemplate.get(template.id);
      return {
        template_id: template.id,
        name: template.name,
        description: template.description,
        template_guidance: template.guidance,
        is_enabled: override ? override.isEnabled : true,
        guidance_override: override?.guidanceOverride ?? null,
      };
    });
  }

  async getOverrides(
    lifeGroupId: number,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    await this.loadAccessibleGroup(lifeGroupId, scope, actor);
    return this.buildOverrides(lifeGroupId);
  }

  async putOverrides(
    lifeGroupId: number,
    entries: TaskOverrideEntryDto[],
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    await this.loadAccessibleGroup(lifeGroupId, scope, actor);

    const templateIds = [...new Set(entries.map((e) => e.templateId))];
    const templates = templateIds.length
      ? await this.em.find(LifeGroupTaskTemplate, {
          where: { id: In(templateIds) },
        })
      : [];
    const known = new Set(templates.map((t) => t.id));
    const unknown = templateIds.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown task template ids: ${unknown.join(', ')}`,
      );
    }

    const existing = await this.em.find(LifeGroupTaskOverride, {
      where: { lifeGroupId },
    });
    const byTemplate = new Map(existing.map((o) => [o.templateId, o]));

    const toSave: LifeGroupTaskOverride[] = [];
    for (const entry of entries) {
      const guidanceOverride = blankToNull(entry.guidanceOverride);
      const current = byTemplate.get(entry.templateId);
      if (current) {
        current.isEnabled = entry.isEnabled;
        current.guidanceOverride = guidanceOverride;
        toSave.push(current);
      } else {
        toSave.push(
          this.em.create(LifeGroupTaskOverride, {
            lifeGroupId,
            templateId: entry.templateId,
            isEnabled: entry.isEnabled,
            guidanceOverride,
          }),
        );
      }
    }
    if (toSave.length > 0) await this.em.save(toSave);
    return this.buildOverrides(lifeGroupId);
  }

  // ---- members (eligibility) -------------------------------------------

  private async buildMembers(lifeGroupId: number) {
    const lifeGroup = await findLifeGroupOrThrow(this.em, lifeGroupId);
    const { minPresentMeetings, members } =
      await this.roster.resolveRoster(lifeGroup);
    return members.map((m) => ({
      user_id: m.user.id,
      name: m.user.name,
      is_leader: m.isLeader,
      is_co_leader: m.isCoLeader,
      eligible: m.eligible,
      // 'manual' | 'leader' | 'auto' | 'pending'
      eligibility_source: m.source,
      present_count: m.presentCount,
      min_present_meetings: minPresentMeetings,
      // True for members grandfathered by the migration (explicit
      // eligible=true row with the system note). Clients must not offer
      // "back to automatic" for them: it would drop an established member.
      grandfathered: m.setting?.reason === GRANDFATHERED_REASON,
      // Leader-only note: this endpoint is leader/admin-only by design.
      // The system grandfather note is never exposed.
      reason:
        m.setting?.reason && m.setting.reason !== GRANDFATHERED_REASON
          ? m.setting.reason
          : null,
      excluded_template_ids: m.setting?.excludedTemplateIds ?? [],
    }));
  }

  async getMembers(
    lifeGroupId: number,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    await this.loadAccessibleGroup(lifeGroupId, scope, actor);
    return this.buildMembers(lifeGroupId);
  }

  async putMembers(
    lifeGroupId: number,
    entries: TaskMemberEntryDto[],
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    const lifeGroup = await this.loadAccessibleGroup(
      lifeGroupId,
      scope,
      actor,
    );
    const { members } = await this.roster.resolveRoster(lifeGroup);
    const rosterIds = new Set(members.map((m) => m.user.id));
    const outsiders = entries
      .map((e) => e.userId)
      .filter((id) => !rosterIds.has(id));
    if (outsiders.length > 0) {
      throw new BadRequestException(
        `Users not in this life group: ${outsiders.join(', ')}`,
      );
    }

    const exclusionIds = [
      ...new Set(entries.flatMap((e) => e.excludedTemplateIds ?? [])),
    ];
    if (exclusionIds.length > 0) {
      const templates = await this.em.find(LifeGroupTaskTemplate, {
        where: { id: In(exclusionIds) },
      });
      const known = new Set(templates.map((t) => t.id));
      const unknown = exclusionIds.filter((id) => !known.has(id));
      if (unknown.length > 0) {
        throw new BadRequestException(
          `Unknown task template ids: ${unknown.join(', ')}`,
        );
      }
    }

    const existing = await this.em.find(LifeGroupTaskMemberSetting, {
      where: { lifeGroupId },
    });
    const byUser = new Map(existing.map((s) => [s.userId, s]));

    const toSave: LifeGroupTaskMemberSetting[] = [];
    const toRemove: LifeGroupTaskMemberSetting[] = [];
    for (const entry of entries) {
      const current = byUser.get(entry.userId);
      if (entry.resetToAutomatic) {
        if (current) toRemove.push(current);
        continue;
      }
      if (typeof entry.eligible !== 'boolean') {
        throw new BadRequestException(
          `eligible is required for user ${entry.userId} unless reset_to_automatic is true.`,
        );
      }
      const setting =
        current ??
        this.em.create(LifeGroupTaskMemberSetting, {
          lifeGroupId,
          userId: entry.userId,
          reason: null,
          excludedTemplateIds: null,
        });
      setting.eligible = entry.eligible;
      if (entry.reason !== undefined) {
        const reason = blankToNull(entry.reason);
        // Clients never see the system grandfather note, so a blank note from
        // them must not erase the marker (it keeps the member flagged as
        // grandfathered). A real leader note replaces it.
        setting.reason =
          reason === null && setting.reason === GRANDFATHERED_REASON
            ? GRANDFATHERED_REASON
            : reason;
      }
      if (entry.excludedTemplateIds !== undefined) {
        setting.excludedTemplateIds =
          entry.excludedTemplateIds.length > 0
            ? entry.excludedTemplateIds
            : null;
      }
      setting.updatedBy = actor.id;
      toSave.push(setting);
    }
    if (toSave.length > 0) await this.em.save(toSave);
    if (toRemove.length > 0) await this.em.remove(toRemove);
    return this.buildMembers(lifeGroupId);
  }

  // ---- group settings --------------------------------------------------

  async getSettings(
    lifeGroupId: number,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    await this.loadAccessibleGroup(lifeGroupId, scope, actor);
    return {
      min_present_meetings:
        await this.roster.getMinPresentMeetings(lifeGroupId),
    };
  }

  async putSettings(
    lifeGroupId: number,
    minPresentMeetings: number,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    await this.loadAccessibleGroup(lifeGroupId, scope, actor);
    const current = await this.em.findOne(LifeGroupTaskGroupSetting, {
      where: { lifeGroupId },
    });
    if (current) {
      current.minPresentMeetings = minPresentMeetings;
      await this.em.save(current);
    } else {
      await this.em.save(
        this.em.create(LifeGroupTaskGroupSetting, {
          lifeGroupId,
          minPresentMeetings,
        }),
      );
    }
    return { min_present_meetings: minPresentMeetings };
  }

  // ---- skipped dates ---------------------------------------------------

  async listSkips(
    lifeGroupId: number,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    await this.loadAccessibleGroup(lifeGroupId, scope, actor);
    const skips = await this.em.find(LifeGroupTaskSkip, {
      where: { lifeGroupId },
      order: { meetingDate: 'DESC' },
    });
    return skips.map((s) => ({ meeting_date: s.meetingDate }));
  }

  /** Idempotent: skipping an already skipped date is a no-op. */
  async addSkip(
    lifeGroupId: number,
    meetingDate: string,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    assertValidDateString(meetingDate, 'meeting_date');
    await this.loadAccessibleGroup(lifeGroupId, scope, actor);
    await this.em
      .createQueryBuilder()
      .insert()
      .into(LifeGroupTaskSkip)
      .values({ lifeGroupId, meetingDate, createdBy: actor.id })
      .orIgnore()
      .execute();
    return { meeting_date: meetingDate };
  }

  async removeSkip(
    lifeGroupId: number,
    meetingDate: string,
    scope: ResolvedScope,
    actor: TaskActor,
  ): Promise<void> {
    assertValidDateString(meetingDate, 'date');
    await this.loadAccessibleGroup(lifeGroupId, scope, actor);
    await this.em.delete(LifeGroupTaskSkip, { lifeGroupId, meetingDate });
  }
}
