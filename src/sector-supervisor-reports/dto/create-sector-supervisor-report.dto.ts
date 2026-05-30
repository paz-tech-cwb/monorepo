import { Expose } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSectorSupervisorReportDto {
  @Expose() @IsDateString() date: string;
  @Expose({ name: 'sector_id' }) @IsInt() sectorId: number;
  @Expose({ name: 'area_id' }) @IsOptional() @IsInt() areaId?: number;
  @Expose({ name: 'life_groups_visited' }) @IsArray() @IsInt({ each: true }) lifeGroupsVisited: number[];
  @Expose({ name: 'leaders_pastored' }) @IsArray() @IsInt({ each: true }) leadersPastored: number[];
  @Expose({ name: 'meetings_held' }) @IsInt() meetingsHeld: number;
  @Expose({ name: 'trainings_conducted' }) @IsInt() trainingsConducted: number;
  @Expose({ name: 'multiplication_candidates' }) @IsArray() @IsInt({ each: true }) multiplicationCandidates: number[];
  @Expose() @IsOptional() @IsString() notes?: string;
}
