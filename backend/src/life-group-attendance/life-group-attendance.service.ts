import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
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
import {
  WEEKDAY_INDEX,
  isoWeekRange,
  weekdayOfDateString,
} from './meeting-day.util';
import { LIFE_GROUP_MAX_EXTRA_MEETINGS_PER_WEEK } from '../common/constants/life-group-meeting';
import { assertCanAccessLifeGroup } from './life-group-access.util';
import { LifeGroupReportSnapshotService } from '../life-group-reports/life-group-report-snapshot.service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Namespace (first int4 key) of the per-(group, ISO week) advisory lock that
// serializes creation of extra meetings (cap check). The meetings API takes its
// own per-(group, date) lock (namespace 4207) first, then this one.
const EXTRA_MEETING_LOCK_NAMESPACE = 4208;

/**
 * Extra-meeting handling, passed ONLY by the meetings API. `requested` is the
 * client's `extra_meeting` (undefined when omitted). The legacy attendance PUT
 * passes nothing and keeps rejecting every non-fixed weekday.
 */
export interface ExtraMeetingOption {
  requested: boolean | undefined;
}

interface Actor {
  id: number;
}

@Injectable()
export class LifeGroupAttendanceService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly auditService: FormSubmissionAuditService,
    // Re-syncs linked reports' committed_* snapshots when attendance changes.
    // Always provided by the Nest modules; optional only so the service can be
    // built standalone (unit tests that do not exercise reports).
    @Optional()
    private readonly reportSnapshots?: LifeGroupReportSnapshotService,
  ) {}

  /**
   * Scope reuses ScopeGuard/ScopeResolverService like the other life-group
   * forms; the group's own leader/co-leader ids are a fallback (see
   * `assertCanAccessLifeGroup`, shared with the meetings module).
   */
  private assertCanAccess(
    lifeGroup: LifeGroup,
    scope: ResolvedScope,
    actor: Actor,
  ): void {
    assertCanAccessLifeGroup(lifeGroup, scope, actor);
  }

  assertValidMeetingDate(meetingDate: string): void {
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
  assertMatchesMeetingDay(lifeGroup: LifeGroup, meetingDate: string): void {
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

  /**
   * Weekday rule for a NEW record, flag-aware (meetings API only). Returns
   * whether the new meeting is an extra one. A fixed-day group meeting on a
   * different weekday requires `extra_meeting: true`; the flag is rejected when
   * it does not apply (regular weekday, or a group without a fixed day).
   */
  resolveNewMeetingIsExtra(
    lifeGroup: LifeGroup,
    meetingDate: string,
    requested: boolean | undefined,
  ): boolean {
    const expectedWeekday = lifeGroup.meetingDay
      ? WEEKDAY_INDEX[lifeGroup.meetingDay]
      : undefined;
    const regular =
      expectedWeekday === undefined ||
      weekdayOfDateString(meetingDate) === expectedWeekday;
    if (requested === true) {
      if (expectedWeekday === undefined) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'extra_meeting_not_applicable',
          message:
            'extra_meeting only applies to life groups with a fixed meeting day; every date is a regular meeting for this group.',
        });
      }
      if (regular) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'extra_meeting_on_regular_day',
          message: `${meetingDate} is a ${lifeGroup.meetingDay}, this life group's regular meeting day; send it without extra_meeting.`,
        });
      }
      return true;
    }
    if (!regular) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'extra_meeting_required',
        message: `${meetingDate} is not a ${lifeGroup.meetingDay} — this life group meets on ${lifeGroup.meetingDay}. To record a meeting on another day, send extra_meeting: true.`,
      });
    }
    return false;
  }

  // Cap on extra meetings per group per ISO week. Takes a lock on (group,
  // week) so two different dates of the same week cannot both pass the count.
  private async assertExtraMeetingCapacity(
    trx: EntityManager,
    lifeGroupId: number,
    meetingDate: string,
  ): Promise<void> {
    const { start, end } = isoWeekRange(meetingDate);
    await trx.query('SELECT pg_advisory_xact_lock($1, hashtext($2))', [
      EXTRA_MEETING_LOCK_NAMESPACE,
      `${lifeGroupId}:${start}`,
    ]);
    const rows = await trx.query<{ c: number }[]>(
      `SELECT count(*)::int AS c FROM life_group_attendance
       WHERE life_group_id = $1 AND is_extra = true
         AND meeting_date BETWEEN $2 AND $3`,
      [lifeGroupId, start, end],
    );
    if (Number(rows[0]?.c ?? 0) >= LIFE_GROUP_MAX_EXTRA_MEETINGS_PER_WEEK) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'extra_meeting_limit_reached',
        message: `At most ${LIFE_GROUP_MAX_EXTRA_MEETINGS_PER_WEEK} extra meetings can be recorded per life group per week (${start} to ${end}).`,
      });
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

  toResponse(attendance: LifeGroupAttendance) {
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
    return this.buildDraft(lifeGroup, meetingDate);
  }

  /**
   * Draft (never persisted) from the group's CURRENT roster, everyone present
   * (product decision Q3: default stays all-present). Enforces the weekday
   * rule like a first save would.
   */
  buildDraft(
    lifeGroup: LifeGroup,
    meetingDate: string,
    extra?: ExtraMeetingOption,
  ) {
    // Flag-aware (meetings API) or legacy weekday rule.
    const isExtra = extra
      ? this.resolveNewMeetingIsExtra(lifeGroup, meetingDate, extra.requested)
      : (this.assertMatchesMeetingDay(lifeGroup, meetingDate), false);

    const members = [...(lifeGroup.users ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return {
      id: null,
      life_group_id: lifeGroup.id,
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
      // Only the flag-aware (meetings API) draft carries `is_extra`; the legacy
      // attendance GET keeps its original shape.
      ...(extra ? { is_extra: isExtra } : {}),
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

    this.assertValidEntries(dto.entries);

    try {
      return await this.em.transaction(async (trx) => {
        const { attendance: loaded, existed } = await this.upsertInTransaction(
          trx,
          lifeGroup,
          meetingDate,
          dto.entries,
          actor.id,
        );

        await this.auditService.record({
          formSlug: 'life_group_attendance',
          submissionId: loaded.id,
          actorId: actor.id,
          action: existed ? 'update' : 'create',
          diff: { entries: dto.entries },
        });

        return this.toResponse(loaded);
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

  assertValidEntries(entries: { userId: number }[]): void {
    if (entries.length === 0) {
      throw new BadRequestException('At least one entry is required.');
    }
    const seenUserIds = new Set<number>();
    for (const entry of entries) {
      if (seenUserIds.has(entry.userId)) {
        throw new BadRequestException(
          `Duplicate user_id ${entry.userId} in entries.`,
        );
      }
      seenUserIds.add(entry.userId);
    }
  }

  /**
   * Core attendance write, shared by the legacy `PUT .../attendance/:date` and
   * the meetings API. Runs inside the caller's transaction; performs NO access
   * check, NO date validation and NO audit (callers own those). `lifeGroup`
   * must be loaded with `users` (roster). Re-syncs the committed_* snapshot of
   * linked reports unless `syncLinkedReports` is false (the meetings API
   * rewrites the report itself in that case).
   */
  async upsertInTransaction(
    trx: EntityManager,
    lifeGroup: LifeGroup,
    meetingDate: string,
    entries: { userId: number; present: boolean }[],
    actorId: number,
    options: {
      syncLinkedReports?: boolean;
      // Meetings API only; absent = legacy weekday rule.
      extra?: ExtraMeetingOption;
    } = {},
  ): Promise<{ attendance: LifeGroupAttendance; existed: boolean }> {
    const lifeGroupId = lifeGroup.id;
    const existing = await trx.findOne(LifeGroupAttendance, {
      where: { lifeGroupId, meetingDate },
      relations: ['entries'],
    });

    const attendance =
      existing ?? trx.create(LifeGroupAttendance, { lifeGroupId, meetingDate });

    attendance.recordedBy = { id: actorId } as User;

    let newEntries: LifeGroupAttendanceEntry[] = [];

    // Preserve the roster snapshot: only update presence for entries
    // that already exist, and only append brand-new entries when this
    // is the FIRST time the record is saved. Reopening a past record
    // never adds members who joined the group afterwards.
    if (existing) {
      // The extra flag is fixed when the record is created. Omitting it keeps
      // the stored value; contradicting it is rejected (never silently flipped).
      const requested = options.extra?.requested;
      if (requested !== undefined && requested !== existing.isExtra) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'extra_meeting_immutable',
          message: existing.isExtra
            ? 'This meeting was saved as an extra meeting; it cannot be turned into a regular one.'
            : 'This meeting was saved as a regular meeting; it cannot be turned into an extra one.',
        });
      }
      const byUserId = new Map(existing.entries.map((e) => [e.userId, e]));
      for (const incoming of entries) {
        const entry = byUserId.get(incoming.userId);
        if (entry) entry.present = incoming.present;
      }
      attendance.membersCount = existing.entries.length;
      attendance.presentCount = existing.entries.filter(
        (e) => e.present,
      ).length;
    } else {
      if (options.extra) {
        attendance.isExtra = this.resolveNewMeetingIsExtra(
          lifeGroup,
          meetingDate,
          options.extra.requested,
        );
        if (attendance.isExtra) {
          await this.assertExtraMeetingCapacity(trx, lifeGroupId, meetingDate);
        }
      } else {
        this.assertMatchesMeetingDay(lifeGroup, meetingDate);
        attendance.isExtra = false;
      }

      // Only the FIRST save for a meeting date creates entries from the
      // submitted payload, so this is the only path where a leader could
      // fabricate members — validate against the group's actual roster.
      const rosterIds = new Set((lifeGroup.users ?? []).map((u) => u.id));
      const unknownUserIds = entries
        .map((e) => e.userId)
        .filter((id) => !rosterIds.has(id));
      if (unknownUserIds.length > 0) {
        throw new BadRequestException(
          `Unknown user_id(s) not in this life group's roster: ${unknownUserIds.join(', ')}`,
        );
      }

      attendance.membersCount = entries.length;
      attendance.presentCount = entries.filter((e) => e.present).length;
      newEntries = entries.map((e) =>
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

    if (options.syncLinkedReports !== false && this.reportSnapshots) {
      await this.reportSnapshots.syncFromAttendance(
        trx,
        {
          id: saved.id,
          membersCount: attendance.membersCount,
          presentCount: attendance.presentCount,
        },
        actorId,
      );
    }

    return { attendance: loaded!, existed: !!existing };
  }
}
