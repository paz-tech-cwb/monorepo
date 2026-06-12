import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAtmosphereTeamDto {
  @Expose() @IsString() name: string;
  @Expose({ name: 'ministry_id' }) @IsInt() ministryId: number;
  @Expose({ name: 'leader_id' }) @IsOptional() @IsInt() leaderId?: number;
}
