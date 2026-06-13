import { Expose } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import type { MembershipMode } from '../entities/ministry.entity';

export class CreateMinistryDto {
  @Expose() @IsString() name: string;
  @Expose() @IsOptional() @IsString() description?: string;
  @Expose({ name: 'membership_mode' }) @IsOptional() @IsIn(['teams', 'direct'])
  membershipMode?: MembershipMode;
  @Expose({ name: 'leader_id' }) @IsOptional() @IsInt() leaderId?: number;
  @Expose({ name: 'co_leader_id' }) @IsOptional() @IsInt() coLeaderId?: number;
}
