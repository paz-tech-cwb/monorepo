import { Expose } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class UpdateMemberStageDto {
  @Expose()
  @IsInt()
  @Min(1)
  @Max(10)
  stage_id: number;

  @Expose()
  @IsBoolean()
  completed: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  completed_at?: string;

  @Expose()
  @IsOptional()
  @IsString()
  note?: string;
}
