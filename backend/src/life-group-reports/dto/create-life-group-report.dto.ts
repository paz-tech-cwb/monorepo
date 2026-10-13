import { Expose } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Sanity ceilings: a typo like 1e9 must not reach the int columns.
const MAX_COUNT = 100000;
const MAX_ARRAY_ITEMS = 20;
const MAX_ITEM_LENGTH = 80;
// `*_other` columns are varchar(180).
const MAX_OTHER_LENGTH = 180;
// life_group_reports.offering is numeric(10,2): 8 integer digits + 2 decimals.
const OFFERING_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

export class CreateLifeGroupReportDto {
  @Expose() @IsDateString() date: string;
  // Accepted for backward compatibility with older clients but IGNORED:
  // area_id and sector_id are always derived server-side from the life
  // group's sector -> area (see LifeGroupReportCreatePolicy).
  @Expose({ name: 'area_id' }) @IsOptional() @IsInt() areaId?: number;
  @Expose({ name: 'sector_id' }) @IsOptional() @IsInt() sectorId?: number;
  @Expose({ name: 'life_group_id' }) @IsInt() lifeGroupId: number;
  @Expose({ name: 'committed_members' })
  @IsInt()
  @Min(0)
  @Max(MAX_COUNT)
  committedMembers: number;
  @Expose({ name: 'committed_members_present' })
  @IsInt()
  @Min(0)
  @Max(MAX_COUNT)
  committedMembersPresent: number;
  @Expose({ name: 'kids_0_to_11' })
  @IsInt()
  @Min(0)
  @Max(MAX_COUNT)
  kids0To11: number;
  @Expose() @IsInt() @Min(0) @Max(MAX_COUNT) guests: number;
  @Expose() @IsInt() @Min(0) @Max(MAX_COUNT) mdas: number;
  @Expose() @IsNumberString() @Matches(OFFERING_PATTERN) offering: string;
  @Expose({ name: 'committed_at_tadel' })
  @IsInt()
  @Min(0)
  @Max(MAX_COUNT)
  committedAtTadel: number;
  @Expose({ name: 'committed_at_culto' })
  @IsInt()
  @Min(0)
  @Max(MAX_COUNT)
  committedAtCulto: number;
  @Expose({ name: 'leader_attended' })
  @IsArray()
  @ArrayMaxSize(MAX_ARRAY_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_ITEM_LENGTH, { each: true })
  leaderAttended: string[];
  @Expose({ name: 'disciples_count' })
  @IsInt()
  @Min(0)
  @Max(MAX_COUNT)
  disciplesCount: number;
  @Expose({ name: 'disciples_discipled_this_week' })
  @IsInt()
  @Min(0)
  @Max(MAX_COUNT)
  disciplesDiscipledThisWeek: number;
  @Expose({ name: 'pastoring_activity_type' })
  @IsArray()
  @ArrayMaxSize(MAX_ARRAY_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_ITEM_LENGTH, { each: true })
  pastoringActivityType: string[];
  @Expose({ name: 'pastoring_activity_other' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_OTHER_LENGTH)
  pastoringActivityOther?: string;
  @Expose({ name: 'training_activity_type' })
  @IsArray()
  @ArrayMaxSize(MAX_ARRAY_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_ITEM_LENGTH, { each: true })
  trainingActivityType: string[];
  @Expose({ name: 'training_activity_other' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_OTHER_LENGTH)
  trainingActivityOther?: string;
}
