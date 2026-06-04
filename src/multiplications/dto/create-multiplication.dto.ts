import { Expose } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateMultiplicationDto {
  @Expose() @IsDateString() date: string;
  @Expose({ name: 'source_life_group_id' }) @IsInt() sourceLifeGroupId: number;
  @Expose({ name: 'area_id' }) @IsInt() areaId: number;
  @Expose({ name: 'sector_id' }) @IsInt() sectorId: number;
  @Expose({ name: 'completed_leadership_track' })
  @IsBoolean()
  completedLeadershipTrack: boolean;
  @Expose({ name: 'legally_married' }) @IsBoolean() legallyMarried: boolean;
  @Expose({ name: 'faithful_tither' }) @IsBoolean() faithfulTither: boolean;
  @Expose({ name: 'evangelizing_and_consolidating' })
  @IsBoolean()
  evangelizingAndConsolidating: boolean;
  @Expose({ name: 'good_testimony' }) @IsBoolean() goodTestimony: boolean;
  @Expose({ name: 'single_living_in_purity' })
  @IsOptional()
  @IsBoolean()
  singleLivingInPurity?: boolean;
  @Expose({ name: 'new_life_group_id' })
  @IsOptional()
  @IsInt()
  newLifeGroupId?: number;
  @Expose({ name: 'new_life_group_name' }) @IsString() newLifeGroupName: string;
  @Expose({ name: 'new_leader_id' }) @IsInt() newLeaderId: number;
  @Expose({ name: 'host_id' }) @IsInt() hostId: number;
  @Expose() @IsString() address: string;
  @Expose({ name: 'leader_phone' })
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/)
  leaderPhone: string;
  @Expose({ name: 'meeting_day_time' }) @IsString() meetingDayTime: string;
  @Expose({ name: 'members_to_move' })
  @IsArray()
  @IsInt({ each: true })
  membersToMove: number[];
  @Expose({ name: 'new_members' })
  @IsArray()
  @IsInt({ each: true })
  newMembers: number[];
}
