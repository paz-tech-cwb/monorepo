import { Expose, Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AttendanceQueryDto {
  // @Expose() is required on every field: the app's global ValidationPipe
  // uses transformOptions.excludeExtraneousValues: true, which silently
  // strips any field not explicitly marked @Expose() during the
  // plain-object -> DTO transform, leaving it undefined regardless of what
  // the client actually sent (e.g. `year`/`month`/`life_group_id` all being
  // ignored, always falling back to their defaults). Same footgun already
  // fixed on response DTOs (UpsertLifeGroupAttendanceDto) — see that file
  // for precedent.
  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  life_group_id?: number;

  // Defaults to 'month' (12 monthly bars for the given year) when omitted.
  // Passing `month` alone doesn't switch granularity automatically — set
  // granularity=meeting explicitly to drill into per-meeting-date bars for
  // that month.
  @Expose()
  @IsOptional()
  @IsIn(['month', 'meeting'])
  @Transform(({ value }) => value ?? 'month')
  granularity?: 'month' | 'meeting';
}
