import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class DistributionQueryDto {
  // @Expose() is required on every field: the app's global ValidationPipe
  // uses transformOptions.excludeExtraneousValues: true, which silently
  // strips any field not explicitly marked @Expose() during the
  // plain-object -> DTO transform, leaving it undefined regardless of what
  // the client actually sent. Same footgun already fixed on response DTOs
  // (UpsertLifeGroupAttendanceDto) — see that file for precedent.
  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  life_group_id?: number;
}
