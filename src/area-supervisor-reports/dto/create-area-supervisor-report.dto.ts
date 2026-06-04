import { Expose } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAreaSupervisorReportDto {
  @Expose() @IsDateString() date: string;
  @Expose({ name: 'area_id' }) @IsInt() areaId: number;
  @Expose({ name: 'sectors_visited' })
  @IsArray()
  @IsInt({ each: true })
  sectorsVisited: number[];
  @Expose({ name: 'sector_leaders_pastored' })
  @IsArray()
  @IsInt({ each: true })
  sectorLeadersPastored: number[];
  @Expose({ name: 'meetings_held' }) @IsInt() meetingsHeld: number;
  @Expose({ name: 'trainings_conducted' }) @IsInt() trainingsConducted: number;
  @Expose({ name: 'multiplications_in_progress' })
  @IsOptional()
  @IsInt()
  multiplicationsInProgress?: number;
  @Expose() @IsOptional() @IsString() notes?: string;
}
