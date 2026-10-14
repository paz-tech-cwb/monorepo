import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class OverviewQueryDto {
  // When present, EVERY figure of the overview is restricted to this single
  // life group (see LifeGroupAnalyticsService.overview). Omitted: unchanged
  // behavior (all groups the caller may see).
  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  life_group_id?: number;
}
