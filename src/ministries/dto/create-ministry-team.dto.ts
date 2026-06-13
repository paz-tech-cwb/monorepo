import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMinistryTeamDto {
  @Expose() @IsString() name: string;
  @Expose({ name: 'ministry_id' }) @IsInt() ministryId: number;
  @Expose({ name: 'leader_id' }) @IsOptional() @IsInt() leaderId?: number;
  @Expose({ name: 'co_leader_id' }) @IsOptional() @IsInt() coLeaderId?: number;
}
