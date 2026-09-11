import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AttendanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  life_group_id?: number;

  // Defaults to 'month' (12 monthly bars for the given year) when omitted.
  // Passing `month` alone doesn't switch granularity automatically — set
  // granularity=meeting explicitly to drill into per-meeting-date bars for
  // that month.
  @IsOptional()
  @IsIn(['month', 'meeting'])
  @Transform(({ value }: { value?: 'month' | 'meeting' }) => value ?? 'month')
  granularity?: 'month' | 'meeting';
}
