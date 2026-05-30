import { Expose } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateLifeGroupReportDto {
  @Expose() @IsDateString() date: string;
  @Expose({ name: 'area_id' }) @IsInt() areaId: number;
  @Expose({ name: 'sector_id' }) @IsInt() sectorId: number;
  @Expose({ name: 'life_group_id' }) @IsInt() lifeGroupId: number;
  @Expose({ name: 'committed_members' }) @IsInt() committedMembers: number;
  @Expose({ name: 'committed_members_present' }) @IsInt() committedMembersPresent: number;
  @Expose({ name: 'kids_0_to_11' }) @IsInt() kids0To11: number;
  @Expose() @IsInt() guests: number;
  @Expose() @IsInt() mdas: number;
  @Expose() @IsNumberString() offering: string;
  @Expose({ name: 'committed_at_tadel' }) @IsInt() committedAtTadel: number;
  @Expose({ name: 'committed_at_culto' }) @IsInt() committedAtCulto: number;
  @Expose({ name: 'leader_attended' }) @IsArray() @IsString({ each: true }) leaderAttended: string[];
  @Expose({ name: 'disciples_count' }) @IsInt() disciplesCount: number;
  @Expose({ name: 'disciples_discipled_this_week' }) @IsInt() disciplesDiscipledThisWeek: number;
  @Expose({ name: 'pastoring_activity_type' }) @IsString() pastoringActivityType: string;
  @Expose({ name: 'pastoring_activity_other' }) @IsOptional() @IsString() pastoringActivityOther?: string;
  @Expose({ name: 'pastoring_activity_objective' }) @IsOptional() @IsString() pastoringActivityObjective?: string;
  @Expose({ name: 'training_activity_type' }) @IsString() trainingActivityType: string;
  @Expose({ name: 'training_activity_other' }) @IsOptional() @IsString() trainingActivityOther?: string;
}
