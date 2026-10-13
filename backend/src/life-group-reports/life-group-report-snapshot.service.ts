import { Injectable } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { LifeGroupReport } from './entities/life-group-report.entity';

const SLUG = 'life-group-reports';

/**
 * A report linked to an attendance record (`attendance_id`) stores
 * `committed_members` / `committed_members_present` as SNAPSHOTS of the
 * attendance (`members_count` / `present_count`, product decisions Q1/Q2).
 * Whenever the attendance is written, linked reports are re-synced in the same
 * transaction. Hooked into the shared attendance upsert so the OLD attendance
 * PUT keeps combined records consistent too. Unlinked (legacy) reports are
 * never touched.
 */
@Injectable()
export class LifeGroupReportSnapshotService {
  constructor(private readonly audit: FormSubmissionAuditService) {}

  async syncFromAttendance(
    manager: EntityManager,
    attendance: { id: string; membersCount: number; presentCount: number },
    actorId: number,
  ): Promise<number> {
    const linked = await manager.find(LifeGroupReport, {
      where: { attendanceId: attendance.id, deletedAt: IsNull() },
    });
    let changed = 0;
    for (const report of linked) {
      if (
        report.committedMembers === attendance.membersCount &&
        report.committedMembersPresent === attendance.presentCount
      ) {
        continue;
      }
      report.committedMembers = attendance.membersCount;
      report.committedMembersPresent = attendance.presentCount;
      await manager.save(LifeGroupReport, report);
      await this.audit.record(
        {
          formSlug: SLUG,
          submissionId: report.id,
          actorId,
          action: 'update',
          diff: {
            synced_from_attendance: attendance.id,
            committed_members: attendance.membersCount,
            committed_members_present: attendance.presentCount,
          },
        },
        manager,
      );
      changed += 1;
    }
    return changed;
  }
}
