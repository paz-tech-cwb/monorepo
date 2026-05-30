import { Expose } from 'class-transformer';
import { IsDateString, IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateServiceReportDto {
  @Expose() @IsDateString() date: string;
  @Expose({ name: 'service_type' }) @IsString() serviceType: string;
  @Expose({ name: 'service_type_other' }) @IsOptional() @IsString() serviceTypeOther?: string;
  @Expose({ name: 'total_attendance' }) @IsInt() totalAttendance: number;
  @Expose({ name: 'members_present' }) @IsInt() membersPresent: number;
  @Expose({ name: 'guests_present' }) @IsInt() guestsPresent: number;
  @Expose({ name: 'kids_present' }) @IsInt() kidsPresent: number;
  @Expose({ name: 'decisions_for_christ' }) @IsInt() decisionsForChrist: number;
  @Expose() @IsInt() reconciliations: number;
  @Expose({ name: 'baptism_candidates' }) @IsOptional() @IsInt() baptismCandidates?: number;
  @Expose() @IsNumberString() offering: string;
  @Expose() @IsOptional() @IsString() notes?: string;
  @Expose({ name: 'area_id' }) @IsOptional() @IsInt() areaId?: number;
  @Expose({ name: 'sector_id' }) @IsOptional() @IsInt() sectorId?: number;
  @Expose({ name: 'life_group_id' }) @IsOptional() @IsInt() lifeGroupId?: number;
}
