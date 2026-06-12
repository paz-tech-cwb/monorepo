import { Expose } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateFormGuestDto {
  @Expose({ name: 'full_name' }) @IsString() fullName: string;
  @Expose() @IsOptional() @IsString() phone?: string;
  @Expose() @IsOptional() @IsString() address?: string;
  @Expose({ name: 'invited_by' }) @IsOptional() @IsString() invitedBy?: string;
  @Expose({ name: 'how_met_church' }) @IsOptional() @IsString() howMetChurch?: string;
  @Expose({ name: 'filled_by' }) @IsOptional() @IsString() filledBy?: string;
  @Expose() @IsOptional() @IsString() notes?: string;
  @Expose({ name: 'via_casa_de_paz' }) @IsOptional() @IsBoolean() viaCasaDePaz?: boolean;
  @Expose({ name: 'area_id' }) @IsOptional() @IsInt() areaId?: number;
  @Expose({ name: 'sector_id' }) @IsOptional() @IsInt() sectorId?: number;
  @Expose({ name: 'life_group_id' }) @IsOptional() @IsInt() lifeGroupId?: number;
}
