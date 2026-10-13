import { LifeGroupReport } from './entities/life-group-report.entity';

export interface LifeGroupReportResponse {
  id: string;
  date: string;
  area_id: number;
  sector_id: number;
  life_group_id: number;
  committed_members: number;
  committed_members_present: number;
  kids_0_to_11: number;
  guests: number;
  mdas: number;
  offering: string;
  committed_at_tadel: number;
  committed_at_culto: number;
  leader_attended: string[];
  disciples_count: number;
  disciples_discipled_this_week: number;
  pastoring_activity_type: string[];
  pastoring_activity_other: string | null;
  training_activity_type: string[];
  training_activity_other: string | null;
  submitted_by: { id: number; name: string } | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// Explicit snake_case mapping (see LifeGroupReportsService for why entities
// must never be returned directly). Shared by the legacy reports controller
// and the meetings API so both expose the exact same report shape.
export function toLifeGroupReportResponse(
  m: LifeGroupReport,
): LifeGroupReportResponse {
  return {
    id: m.id,
    date: m.date,
    area_id: m.areaId,
    sector_id: m.sectorId,
    life_group_id: m.lifeGroupId,
    committed_members: m.committedMembers,
    committed_members_present: m.committedMembersPresent,
    kids_0_to_11: m.kids0To11,
    guests: m.guests,
    mdas: m.mdas,
    offering: m.offering,
    committed_at_tadel: m.committedAtTadel,
    committed_at_culto: m.committedAtCulto,
    leader_attended: m.leaderAttended ?? [],
    disciples_count: m.disciplesCount,
    disciples_discipled_this_week: m.disciplesDiscipledThisWeek,
    pastoring_activity_type: m.pastoringActivityType ?? [],
    pastoring_activity_other: m.pastoringActivityOther ?? null,
    training_activity_type: m.trainingActivityType ?? [],
    training_activity_other: m.trainingActivityOther ?? null,
    submitted_by: m.submittedBy
      ? { id: m.submittedBy.id, name: m.submittedBy.name }
      : null,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    deleted_at: m.deletedAt ?? null,
  };
}

// The 12 report columns a leader types in (everything that is NOT derived from
// the group, the date or the attendance). Shared by the legacy create and the
// meetings upsert so both write them identically.
export interface LifeGroupReportInput {
  kids0To11: number;
  guests: number;
  mdas: number;
  offering: string;
  committedAtTadel: number;
  committedAtCulto: number;
  leaderAttended: string[];
  disciplesCount: number;
  disciplesDiscipledThisWeek: number;
  pastoringActivityType: string[];
  pastoringActivityOther?: string | null;
  trainingActivityType: string[];
  trainingActivityOther?: string | null;
}

export function pickLifeGroupReportInputColumns(
  input: LifeGroupReportInput,
): Pick<
  LifeGroupReport,
  | 'kids0To11'
  | 'guests'
  | 'mdas'
  | 'offering'
  | 'committedAtTadel'
  | 'committedAtCulto'
  | 'leaderAttended'
  | 'disciplesCount'
  | 'disciplesDiscipledThisWeek'
  | 'pastoringActivityType'
  | 'pastoringActivityOther'
  | 'trainingActivityType'
  | 'trainingActivityOther'
> {
  return {
    kids0To11: input.kids0To11,
    guests: input.guests,
    mdas: input.mdas,
    offering: input.offering,
    committedAtTadel: input.committedAtTadel,
    committedAtCulto: input.committedAtCulto,
    leaderAttended: input.leaderAttended,
    disciplesCount: input.disciplesCount,
    disciplesDiscipledThisWeek: input.disciplesDiscipledThisWeek,
    pastoringActivityType: input.pastoringActivityType,
    pastoringActivityOther: input.pastoringActivityOther ?? null,
    trainingActivityType: input.trainingActivityType,
    trainingActivityOther: input.trainingActivityOther ?? null,
  };
}
