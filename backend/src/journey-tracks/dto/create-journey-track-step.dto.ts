import { Expose } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import type { JourneyTrackStepType } from '../entities/journey-track-step.entity';

const STEP_TYPES: JourneyTrackStepType[] = [
  'course_completion',
  'manual_approval',
  'informational',
];

export class CreateJourneyTrackStepDto {
  @Expose()
  @IsOptional()
  @IsString()
  key?: string | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @Expose()
  @IsIn(STEP_TYPES)
  type: JourneyTrackStepType;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string | null;

  @Expose()
  @IsOptional()
  @IsUUID()
  course_id?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  external_url?: string | null;
}
