import { Expose, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TaskOverrideEntryDto {
  @Expose({ name: 'template_id' })
  @IsInt()
  templateId: number;

  @Expose({ name: 'is_enabled' })
  @IsBoolean()
  isEnabled: boolean;

  // null/empty clears the override (template guidance is used).
  @Expose({ name: 'guidance_override' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  guidanceOverride?: string | null;
}

export class UpsertTaskOverridesDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskOverrideEntryDto)
  overrides: TaskOverrideEntryDto[];
}

export class TaskMemberEntryDto {
  @Expose({ name: 'user_id' })
  @IsInt()
  userId: number;

  // Required unless reset_to_automatic is true.
  @Expose()
  @IsOptional()
  @IsBoolean()
  eligible?: boolean;

  // Leader-only note. Omitted = unchanged; null/empty = cleared.
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string | null;

  // Omitted = unchanged; [] = cleared.
  @Expose({ name: 'excluded_template_ids' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  excludedTemplateIds?: number[];

  // Deletes the explicit row so the automatic rule applies again.
  @Expose({ name: 'reset_to_automatic' })
  @IsOptional()
  @IsBoolean()
  resetToAutomatic?: boolean;
}

export class UpsertTaskMembersDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskMemberEntryDto)
  members: TaskMemberEntryDto[];
}

export class UpdateTaskSettingsDto {
  @Expose({ name: 'min_present_meetings' })
  @IsInt()
  @Min(0)
  @Max(52)
  minPresentMeetings: number;
}

export class TaskMeetingDateDto {
  @Expose({ name: 'meeting_date' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  meetingDate: string;
}
