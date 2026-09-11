import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LifeGroupAttendance } from './entities/life-group-attendance.entity';
import { LifeGroupAttendanceEntry } from './entities/life-group-attendance-entry.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { User } from '../users/entities/user.entity';
import { UpsertLifeGroupAttendanceDto } from './dto/upsert-life-group-attendance.dto';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { WEEKDAY_INDEX, weekdayOfDateString } from './meeting-day.util';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Actor {
  id: number;
}

@Injectable()
export class LifeGroupAttendanceService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly auditService: FormSubmissionAuditService,
  ) {}

  /**
   * Scope reuses ScopeGuard/ScopeResolverService like the other life-group
   * forms, but the resolved scope is only aware of the `life_group_leader`
   * role — a co-leader (`co_leader_id`) has no dedicated role slug, so we
   * fall back to checking the life group record directly for that case.
   * The primary leader (`leader_id`) gets the same fallback: their role
   * slug may not be `life_group_leader` either, so scope alone must not be
   * the only way in for them.
   */
  private assertCanAccess(
    lifeGroup: LifeGroup,
    scope: ResolvedScope,
    actor: Actor,
  ): void {
    if (scope.unrestricted) return;
    if (scope.lifeGroupIds.includes(lifeGroup.id)) return;
    if (lifeGroup.coLeader?.id === actor.id) return;
    if (lifeGroup.leader?.id === actor.id) return;
    throw new ForbiddenException('You do not have access to this life group.');
  }

  private assertValidMeetingDate(meetingDate: string): void {
    if (!DATE_RE.test(meetingDate)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format.');
    }
    const parsed = new Date(`${meetingDate}T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== meetingDate
    ) {
      throw new BadRequestException('date is not a valid calendar date.');
    }
    const todayKey = new Date().toISOString().slice(0, 10);
    if (meetingDate > todayKey) {
      throw new BadRequestException('date cannot be in the future.');
    }
  }

  /**
   * Only enforced when creating a NEW record (no existing row for this
   * date) — a group's meeting_day can change over time, and a previously
   * saved record must remain viewable/editable even if it no longer
   * matches the group's current schedule.
   */
  private assertMatchesMeetingDay(
    lifeGroup: LifeGroup,
    meetingDate: string,
  ): void {
    const expectedWeekday = lifeGroup.meetingDay
      ? WEEKDAY_INDEX[lifeGroup.meetingDay]
      : undefined;
    if (expectedWeekday === undefined) return;
    if (weekdayOfDateString(meetingDate) !== expectedWeekday) {
      throw new BadRequestException(
        `${meetingDate} is not a ${lifeGroup.meetingDay} — this life group meets on ${lifeGroup.meetingDay}.`,
      );
    }
  }

  private async findLifeGroup(lifeGroupId: number): Promise<LifeGroup> {
    const lifeGroup = await this.em.findOne(LifeGroup, {
      where: { id: lifeGroupId },
      relations: ['leader', 'coLeader', 'users'],
    });
    if (!lifeGroup) {
      throw new NotFoundException(
        `Life group with ID ${lifeGroupId} not found`,
      );
    }
    return lifeGroup;
  }

  private toResponse(attendance: LifeGroupAttendance) {
    return {
      id: attendance.id,
      life_group_id: attendance.lifeGroupId,
      meeting_date: attendance.meetingDate,
      present_count: attendance.presentCount,
      members_count: attendance.membersCount,
      recorded_by: attendance.recordedBy?.id ?? null,
      entries: (attendance.entries ?? [])
        .map((entry) => ({
          user_id: entry.userId,
          name: entry.user?.name ?? '',
          present: entry.present,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      created_at: attendance.createdAt,
      updated_at: attendance.updatedAt,
    };
  }

  async list(
    lifeGroupId: number,
    scope: ResolvedScope,
    actor: Actor,
  ): Promise<ReturnType<typeof this.toResponse>[]> {
    const lifeGroup = await this.findLifeGroup(lifeGroupId);
    this.assertCanAccess(lifeGroup, scope, actor);

    const records = await this.em.find(LifeGroupAttendance, {
      where: { lifeGroupId },
      relations: ['entries', 'entries.user', 'recordedBy'],
      order: { meetingDate: 'DESC' },
    });
    return records.map((r) => this.toResponse(r));
  }

  /**
   * Returns the existing record for `meetingDate` if one was already saved,
   * or a draft built from the group's current roster otherwise. The draft is
   * not persisted — it exists purely so the mobile editor can render a
   * checklist before the leader has ever tapped save for that date.
   */
  async getByDate(
    lifeGroupId: number,
    meetingDate: string,
    scope: ResolvedScope,
    actor: Actor,
  ) {
    this.assertValidMeetingDate(meetingDate);
    const lifeGroup = await this.findLifeGroup(lifeGroupId);
    this.assertCanAccess(lifeGroup, scope, actor);

    const existing = await this.em.findOne(LifeGroupAttendance, {
      where: { lifeGroupId, meetingDate },
      relations: ['entries', 'entries.user', 'recordedBy'],
    });
    if (existing) {
      return { ...this.toResponse(existing), is_draft: false };
    }
    this.assertMatchesMeetingDay(lifeGroup, meetingDate);

    const members = [...(lifeGroup.users ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return {
      id: null,
      life_group_id: lifeGroupId,
      meeting_date: meetingDate,
      present_count: members.length,
      members_count: members.length,
      recorded_by: null,
      entries: members.map((u) => ({
        user_id: u.id,
        name: u.name,
        present: true,
      })),
      created_at: null,
      updated_at: null,
      is_draft: true,
    };
  }

  async upsert(
    lifeGroupId: number,
    meetingDate: string,
    dto: UpsertLifeGroupAttendanceDto,
    scope: ResolvedScope,
    actor: Actor,
    retrying = false,
  ): Promise<ReturnType<typeof this.toResponse>> {
    this.assertValidMeetingDate(meetingDate);
    const lifeGroup = await this.findLifeGroup(lifeGroupId);
    this.assertCanAccess(lifeGroup, scope, actor);

    if (dto.entries.length === 0) {
      throw new BadRequestException('At least one entry is required.');
    }

    const seenUserIds = new Set<number>();
    for (const entry of dto.entries) {
      if (seenUserIds.has(entry.userId)) {
        throw new BadRequestException(
          `Duplicate user_id ${entry.userId} in entries.`,
        );
      }
      seenUserIds.add(entry.userId);
    }

    try {
      return await this.em.transaction(async (trx) => {
        const existing = await trx.findOne(LifeGroupAttendance, {
          where: { lifeGroupId, meetingDate },
          relations: ['entries'],
        });

        const attendance =
          existing ??
          trx.create(LifeGroupAttendance, { lifeGroupId, meetingDate });

        attendance.recordedBy = { id: actor.id } as User;

        let newEntries: LifeGroupAttendanceEntry[] = [];

        // Preserve the roster snapshot: only update presence for entries
        // that already exist, and only append brand-new entries when this
        // is the FIRST time the record is saved. Reopening a past record
        // never adds members who joined the group afterwards.
        if (existing) {
          const byUserId = new Map(existing.entries.map((e) => [e.userId, e]));
          for (const incoming of dto.entries) {
            const entry = byUserId.get(incoming.userId);
            if (entry) entry.present = incoming.present;
          }
          attendance.membersCount = existing.entries.length;
          attendance.presentCount = existing.entries.filter(
            (e) => e.present,
          ).length;
        } else {
          this.assertMatchesMeetingDay(lifeGroup, meetingDate);

          // Only the FIRST save for a meeting date creates entries from the
          // submitted payload, so this is the only path where a leader could
          // fabricate members — validate against the group's actual roster.
          const rosterIds = new Set((lifeGroup.users ?? []).map((u) => u.id));
          const unknownUserIds = dto.entries
            .map((e) => e.userId)
            .filter((id) => !rosterIds.has(id));
          if (unknownUserIds.length > 0) {
            throw new BadRequestException(
              `Unknown user_id(s) not in this life group's roster: ${unknownUserIds.join(', ')}`,
            );
          }

          attendance.membersCount = dto.entries.length;
          attendance.presentCount = dto.entries.filter((e) => e.present).length;
          newEntries = dto.entries.map((e) =>
            trx.create(LifeGroupAttendanceEntry, {
              userId: e.userId,
              present: e.present,
            }),
          );
        }

        // Saved without the `entries` relation assigned, then entries are
        // linked and persisted explicitly below — cascading a fresh child
        // array through `entries` here left `attendance_id` NULL on insert
        // (the parent's generated id wasn't backfilled onto the children by
        // the cascade for this uuid-PK/OneToMany shape), so the FK is set
        // by hand once the parent's real id is known.
        const saved = await trx.save(LifeGroupAttendance, attendance);

        if (existing) {
          await trx.save(LifeGroupAttendanceEntry, existing.entries);
        } else if (newEntries.length > 0) {
          for (const entry of newEntries) entry.attendance = saved;
          await trx.save(LifeGroupAttendanceEntry, newEntries);
        }

        const loaded = await trx.findOne(LifeGroupAttendance, {
          where: { id: saved.id },
          relations: ['entries', 'entries.user', 'recordedBy'],
        });

        await this.auditService.record({
          formSlug: 'life_group_attendance',
          submissionId: saved.id,
          actorId: actor.id,
          action: existing ? 'update' : 'create',
          diff: { entries: dto.entries },
        });

        return this.toResponse(loaded!);
      });
    } catch (err: unknown) {
      // Concurrent double-submit for the same life group + meeting date can
      // race past the findOne-then-insert check above and hit the unique
      // constraint; retry once as an update rather than surfacing a 500.
      if (!retrying && (err as { code?: string }).code === '23505') {
        return this.upsert(lifeGroupId, meetingDate, dto, scope, actor, true);
      }
      throw err;
    }
  }
}
