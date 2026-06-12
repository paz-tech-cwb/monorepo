import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAtmosphereMinistryDto {
  @Expose() @IsString() name: string;
  @Expose({ name: 'leader_id' }) @IsOptional() @IsInt() leaderId?: number;
}
