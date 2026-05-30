import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class CreateFormGuestDto {
  @Expose({ name: 'full_name' }) @IsString() fullName: string;
  @Expose() @IsOptional() @IsString() email?: string;
  @Expose() @IsString() @Matches(/^\+?[0-9]{8,15}$/) phone: string;
  @Expose() @IsOptional() @IsString() address?: string;
  @Expose({ name: 'invited_by' }) @IsString() invitedBy: string;
  @Expose({ name: 'how_met_church' }) @IsOptional() @IsString() howMetChurch?: string;
  @Expose() @IsOptional() @IsString() notes?: string;
  @Expose({ name: 'area_id' }) @IsOptional() @IsInt() areaId?: number;
  @Expose({ name: 'sector_id' }) @IsOptional() @IsInt() sectorId?: number;
  @Expose({ name: 'life_group_id' }) @IsOptional() @IsInt() lifeGroupId?: number;
}
