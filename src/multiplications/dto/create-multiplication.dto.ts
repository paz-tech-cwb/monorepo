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
  @Expose() @IsOptional() @IsString() area?: string;
  @Expose() @IsOptional() @IsString() sector?: string;
  @Expose({ name: 'completed_leadership_track' })
  @IsBoolean()
  completedLeadershipTrack: boolean;
  @Expose({ name: 'legally_married' })
  @IsOptional()
  @IsBoolean()
  legallyMarried?: boolean;
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
  // New LG fields
  @Expose({ name: 'new_lg_name' }) @IsOptional() @IsString() newLgName?: string;
  @Expose({ name: 'new_lg_leader' })
  @IsOptional()
  @IsString()
  newLgLeader?: string;
  @Expose({ name: 'new_lg_host' }) @IsOptional() @IsString() newLgHost?: string;
  @Expose({ name: 'new_lg_address' })
  @IsOptional()
  @IsString()
  newLgAddress?: string;
  @Expose({ name: 'new_lg_leader_phone' })
  @IsOptional()
  @IsString()
  newLgLeaderPhone?: string;
  @Expose({ name: 'new_lg_meeting_day_time' })
  @IsOptional()
  @IsString()
  newLgMeetingDayTime?: string;
  @Expose({ name: 'new_lg_members' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newLgMembers?: string[];
  @Expose({ name: 'old_lg_name' }) @IsOptional() @IsString() oldLgName?: string;
  @Expose({ name: 'old_lg_leader' })
  @IsOptional()
  @IsString()
  oldLgLeader?: string;
  @Expose({ name: 'old_lg_host' }) @IsOptional() @IsString() oldLgHost?: string;
  @Expose({ name: 'old_lg_address' })
  @IsOptional()
  @IsString()
  oldLgAddress?: string;
  @Expose({ name: 'old_lg_leader_phone' })
  @IsOptional()
  @IsString()
  oldLgLeaderPhone?: string;
  @Expose({ name: 'old_lg_meeting_day_time' })
  @IsOptional()
  @IsString()
  oldLgMeetingDayTime?: string;
  @Expose({ name: 'old_lg_members' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  oldLgMembers?: string[];
}
