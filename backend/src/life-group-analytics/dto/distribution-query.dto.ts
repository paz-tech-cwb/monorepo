import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class DistributionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  life_group_id?: number;
}
