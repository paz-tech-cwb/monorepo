import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// `@Expose()` is mandatory: the global ValidationPipe runs with
// `excludeExtraneousValues: true`, which silently drops un-exposed fields
// (see life-group-analytics.controller.spec.ts for the original regression).
export class ListLifeGroupReportsQueryDto {
  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  life_group_id?: number;
}
