import { Expose } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSectorSupervisorReportDto {
  @Expose() @IsDateString() date: string;
  @Expose({ name: 'sector_id' }) @IsInt() sectorId: number;
  @Expose({ name: 'area_id' }) @IsOptional() @IsInt() areaId?: number;
  @Expose({ name: 'life_groups_visited' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  lifeGroupsVisited?: number[];
  @Expose({ name: 'leaders_pastored' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  leadersPastored?: number[];
  @Expose({ name: 'multiplication_candidates' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  multiplicationCandidates?: number[];
  @Expose({ name: 'life_groups_count' })
  @IsInt()
  @Min(0)
  lifeGroupsCount: number;
  @Expose({ name: 'life_groups_supervised' })
  @IsInt()
  @Min(0)
  lifeGroupsSupervised: number;
  @Expose({ name: 'life_group_observations' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lifeGroupObservations?: string[];
  @Expose({ name: 'sector_multiplication_date' })
  @IsOptional()
  @IsString()
  sectorMultiplicationDate?: string;
  @Expose() @IsOptional() @IsString() notes?: string;
}
