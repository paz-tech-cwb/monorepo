import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AttendanceEntryDto } from '../../life-group-attendance/dto/upsert-life-group-attendance.dto';

// Wire names are snake_case via @Expose. The global pipe runs with
// `excludeExtraneousValues`, so any key without @Expose (notably `date`,
// `area_id`, `sector_id`, `life_group_id`, `committed_members`,
// `committed_members_present`) is stripped and IGNORED: those values come from
// the path, the group and the attendance, never from the client.

const MAX_COUNT = 100_000;
const MAX_ARRAY_ITEMS = 20;
const MAX_ITEM_LENGTH = 80;

export class MeetingAttendanceDto {
  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}

export class MeetingReportDto {
  @Expose({ name: 'kids_0_to_11' })
  @IsInt()
  @Min(0)
  @Max(MAX_COUNT)
  kids0To11: number;

  @Expose() @IsInt() @Min(0) @Max(MAX_COUNT) guests: number;
  @Expose() @IsInt() @Min(0) @Max(MAX_COUNT) mdas: number;

  // numeric(10,2): up to 8 integer digits and 2 decimals, no sign.
  @Expose()
  @IsString()
  @Matches(/^\d{1,8}(\.\d{1,2})?$/, {
    message: 'offering must be a non-negative decimal with up to 2 decimals',
  })
  offering: string;

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
  @MaxLength(180)
  pastoringActivityOther?: string | null;

  @Expose({ name: 'training_activity_type' })
  @IsArray()
  @ArrayMaxSize(MAX_ARRAY_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_ITEM_LENGTH, { each: true })
  trainingActivityType: string[];

  @Expose({ name: 'training_activity_other' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  trainingActivityOther?: string | null;
}

export class UpsertLifeGroupMeetingDto {
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => MeetingAttendanceDto)
  attendance?: MeetingAttendanceDto | null;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => MeetingReportDto)
  report?: MeetingReportDto | null;
}
