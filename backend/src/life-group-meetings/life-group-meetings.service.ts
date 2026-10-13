import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, IsNull } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupAttendance } from '../life-group-attendance/entities/life-group-attendance.entity';
import { LifeGroupAttendanceService } from '../life-group-attendance/life-group-attendance.service';
import { assertCanAccessLifeGroup } from '../life-group-attendance/life-group-access.util';
import { LifeGroupReport } from '../life-group-reports/entities/life-group-report.entity';
import {
  LifeGroupReportResponse,
  pickLifeGroupReportInputColumns,
  toLifeGroupReportResponse,
} from '../life-group-reports/life-group-report.mapper';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { User } from '../users/entities/user.entity';
import { UpsertLifeGroupMeetingDto } from './dto/upsert-life-group-meeting.dto';
import {
  assertCanEditMeeting,
  canEditMeeting,
  meetingEditDeadline,
} from './meeting-edit-policy';

const ATTENDANCE_SLUG = 'life_group_attendance';
const REPORT_SLUG = 'life-group-reports';
// Namespace (first int4 key) of the per-(group,date) advisory lock.
const MEETING_LOCK_NAMESPACE = 4207;

export interface MeetingActor {
  id: number;
  isAdmin: boolean;
}

export type ReportBlockedReason =
  | 'group_has_no_sector'
  | 'sector_has_no_area'
  | null;

export interface LifeGroupMeetingResponse {
  life_group_id: number;
  meeting_date: string;
  attendance: Record<string, unknown> | null;
  report: LifeGroupReportResponse | null;
  derived: {
    committed_members: number | null;
    committed_members_present: number | null;
  };
  can_edit: boolean;
  edit_deadline: string;
  report_blocked_reason: ReportBlockedReason;
}

@Injectable()
export class LifeGroupMeetingsService {
  private readonly logger = new Logger(LifeGroupMeetingsService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly attendance: LifeGroupAttendanceService,
    private readonly audit: FormSubmissionAuditService,
  ) {}

  private async findLifeGroup(
    manager: EntityManager,
    lifeGroupId: number,
  ): Promise<LifeGroup> {
    const lifeGroup = await manager.findOne(LifeGroup, {
      where: { id: lifeGroupId },
      relations: ['leader', 'coLeader', 'users', 'sector', 'sector.area'],
    });
    if (!lifeGroup) {
      throw new NotFoundException(
        `Life group with ID ${lifeGroupId} not found`,
      );
    }
    return lifeGroup;
  }

  private reportBlockedReason(lifeGroup: LifeGroup): ReportBlockedReason {
    if (!lifeGroup.sector) return 'group_has_no_sector';
    if (!lifeGroup.sector.area) return 'sector_has_no_area';
    return null;
  }

  // Active (non-deleted) reports of the meeting, oldest first. More than one
  // can only exist in a database where the partial unique index could not be
  // created (duplicates predating the migration); the oldest is canonical.
  private async findReports(
    manager: EntityManager,
    lifeGroupId: number,
    date: string,
  ): Promise<LifeGroupReport[]> {
    const rows = await manager.find(LifeGroupReport, {
      where: { lifeGroupId, date, deletedAt: IsNull() },
      relations: ['submittedBy'],
      order: { createdAt: 'ASC' },
    });
    if (rows.length > 1) {
      this.logger.warn(
        `Life group ${lifeGroupId} has ${rows.length} active reports for ${date}; using the oldest (${rows[0].id}).`,
      );
    }
    return rows;
  }

  private async buildView(
    manager: EntityManager,
    lifeGroup: LifeGroup,
    meetingDate: string,
    actor: MeetingActor,
  ): Promise<LifeGroupMeetingResponse> {
    const saved = await manager.findOne(LifeGroupAttendance, {
      where: { lifeGroupId: lifeGroup.id, meetingDate },
      relations: ['entries', 'entries.user', 'recordedBy'],
    });
    const [report] = await this.findReports(manager, lifeGroup.id, meetingDate);

    let attendance: Record<string, unknown> | null = null;
    if (saved) {
      attendance = {
        ...this.attendance.toResponse(saved),
        is_draft: false,
        default_present: null,
      };
    } else {
      try {
        // Draft from the CURRENT roster, everyone present (decision Q3);
        // `default_present` lets mobile show an explicit "Todos presentes".
        attendance = {
          ...this.attendance.buildDraft(lifeGroup, meetingDate),
          default_present: true,
        };
      } catch (err: unknown) {
        // A legacy report on a date that is not the group's weekday must stay
        // readable; otherwise the weekday rule applies exactly as it does for
        // the attendance GET.
        if (!(err instanceof BadRequestException) || !report) throw err;
      }
    }

    return {
      life_group_id: lifeGroup.id,
      meeting_date: meetingDate,
      attendance,
      report: report ? toLifeGroupReportResponse(report) : null,
      derived: {
        committed_members:
          (attendance?.members_count as number | undefined) ?? null,
        committed_members_present:
          (attendance?.present_count as number | undefined) ?? null,
      },
      can_edit: canEditMeeting(actor, meetingDate),
      edit_deadline: meetingEditDeadline(meetingDate),
      report_blocked_reason: this.reportBlockedReason(lifeGroup),
    };
  }

  async getMeeting(
    lifeGroupId: number,
    meetingDate: string,
    scope: ResolvedScope,
    actor: MeetingActor,
  ): Promise<LifeGroupMeetingResponse> {
    this.attendance.assertValidMeetingDate(meetingDate);
    const lifeGroup = await this.findLifeGroup(this.em, lifeGroupId);
    assertCanAccessLifeGroup(lifeGroup, scope, actor);
    return this.buildView(this.em, lifeGroup, meetingDate, actor);
  }

  async upsertMeeting(
    lifeGroupId: number,
    meetingDate: string,
    dto: UpsertLifeGroupMeetingDto,
    scope: ResolvedScope,
    actor: MeetingActor,
    retrying = false,
  ): Promise<LifeGroupMeetingResponse> {
    this.attendance.assertValidMeetingDate(meetingDate);
    const initial = await this.findLifeGroup(this.em, lifeGroupId);
    assertCanAccessLifeGroup(initial, scope, actor);

    const attendanceInput = dto.attendance ?? null;
    const reportInput = dto.report ?? null;
    if (!attendanceInput && !reportInput) {
      throw new BadRequestException(
        'At least one of attendance or report is required.',
      );
    }
    assertCanEditMeeting(actor, meetingDate);
    if (attendanceInput) {
      this.attendance.assertValidEntries(attendanceInput.entries);
    }
    if (reportInput) {
      // Fail before any write when the report cannot be attributed.
      const blocked = this.reportBlockedReason(initial);
      if (blocked) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          error: 'Unprocessable Entity',
          code: blocked,
          message:
            blocked === 'group_has_no_sector'
              ? 'This life group has no sector, so a report cannot be filed. Ask an admin to assign a sector.'
              : "This life group's sector has no area, so a report cannot be filed. Ask an admin to assign an area.",
        });
      }
    }

    try {
      return await this.em.transaction(async (trx) => {
        // Serialize writers of the same meeting: with the lock held, the
        // find-then-upsert below cannot interleave, so concurrent PUTs yield
        // one attendance row and one report row even when the partial unique
        // index on reports is absent.
        await trx.query('SELECT pg_advisory_xact_lock($1, hashtext($2))', [
          MEETING_LOCK_NAMESPACE,
          `${lifeGroupId}:${meetingDate}`,
        ]);
        // Re-read inside the lock so the roster snapshot is current.
        const lifeGroup = await this.findLifeGroup(trx, lifeGroupId);

        let attendance: LifeGroupAttendance | null = null;
        if (attendanceInput) {
          const result = await this.attendance.upsertInTransaction(
            trx,
            lifeGroup,
            meetingDate,
            attendanceInput.entries,
            actor.id,
            // The report below rewrites its own snapshot.
            { syncLinkedReports: !reportInput },
          );
          attendance = result.attendance;
          await this.audit.record(
            {
              formSlug: ATTENDANCE_SLUG,
              submissionId: attendance.id,
              actorId: actor.id,
              action: result.existed ? 'update' : 'create',
              diff: { entries: attendanceInput.entries },
            },
            trx,
          );
        } else {
          attendance = await trx.findOne(LifeGroupAttendance, {
            where: { lifeGroupId, meetingDate },
          });
        }

        if (reportInput) {
          if (!attendance) {
            throw new ConflictException({
              statusCode: 409,
              error: 'Conflict',
              code: 'attendance_required',
              message:
                'Attendance must exist for this meeting before a report can be filed. Send attendance first or in the same request.',
            });
          }
          await this.upsertReport(
            trx,
            lifeGroup,
            meetingDate,
            reportInput,
            attendance,
            actor,
          );
        }

        return this.buildView(trx, lifeGroup, meetingDate, actor);
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        // A writer outside this API (legacy attendance PUT / legacy report
        // POST) won the race for the unique key: replay once so we update
        // instead of insert; then surface a clean 409.
        if (!retrying) {
          return this.upsertMeeting(
            lifeGroupId,
            meetingDate,
            dto,
            scope,
            actor,
            true,
          );
        }
        throw new ConflictException(
          'This meeting was changed concurrently. Reload and try again.',
        );
      }
      throw err;
    }
  }

  private async upsertReport(
    trx: EntityManager,
    lifeGroup: LifeGroup,
    meetingDate: string,
    input: NonNullable<UpsertLifeGroupMeetingDto['report']>,
    attendance: Pick<
      LifeGroupAttendance,
      'id' | 'membersCount' | 'presentCount'
    >,
    actor: MeetingActor,
  ): Promise<void> {
    const [existing] = await this.findReports(trx, lifeGroup.id, meetingDate);

    // Derived server-side, never from the client: area/sector from the group's
    // sector (checked non-null by the caller) and committed_* snapshots from
    // the attendance (product decisions Q1/Q2).
    const columns = {
      ...pickLifeGroupReportInputColumns(input),
      areaId: lifeGroup.sector!.area!.id,
      sectorId: lifeGroup.sector!.id,
      committedMembers: attendance.membersCount,
      committedMembersPresent: attendance.presentCount,
      attendanceId: attendance.id,
    };

    let report: LifeGroupReport;
    if (existing) {
      report = Object.assign(existing, columns);
    } else {
      report = trx.create(LifeGroupReport, {
        ...columns,
        date: meetingDate,
        lifeGroupId: lifeGroup.id,
        submittedBy: { id: actor.id } as User,
      });
    }
    const saved = await trx.save(LifeGroupReport, report);

    await this.audit.record(
      {
        formSlug: REPORT_SLUG,
        submissionId: saved.id,
        actorId: actor.id,
        action: existing ? 'update' : 'create',
        diff: {
          ...pickLifeGroupReportInputColumns(input),
          committedMembers: attendance.membersCount,
          committedMembersPresent: attendance.presentCount,
          attendanceId: attendance.id,
          via: 'life_group_meetings',
        },
      },
      trx,
    );
  }
}
