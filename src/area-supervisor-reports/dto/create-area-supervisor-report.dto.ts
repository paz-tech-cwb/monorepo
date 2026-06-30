import { Expose } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAreaSupervisorReportDto {
  @Expose() @IsDateString() date: string;
  @Expose({ name: 'area_id' }) @IsInt() areaId: number;
  @Expose({ name: 'sectors_visited' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  sectorsVisited?: number[];
  @Expose({ name: 'sector_leaders_pastored' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  sectorLeadersPastored?: number[];
  @Expose({ name: 'multiplications_in_progress' })
  @IsOptional()
  @IsInt()
  multiplicationsInProgress?: number;
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
  @Expose() @IsOptional() @IsString() notes?: string;
}
