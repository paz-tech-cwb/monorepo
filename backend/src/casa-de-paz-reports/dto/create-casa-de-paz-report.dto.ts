import { Expose } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

// Mirrors admin-ui's MEETING_DAYS list (life-groups-management.tsx), minus
// "Sem dia fixo" — a Casa de Paz report always has a fixed meeting day when
// one is provided at all.
export const CASA_DE_PAZ_MEETING_DAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export class CreateCasaDePazReportDto {
  @Expose() @IsDateString() date: string;
  @Expose() @IsString() @Length(1, 180) facilitator: string;
  @Expose({ name: 'sector_id' }) @IsInt() sectorId: number;
  @Expose() @IsInt() adults: number;
  @Expose() @IsOptional() @IsInt() kids?: number;
  @Expose() @IsOptional() @IsInt() guests?: number;
  @Expose() @IsOptional() @IsInt() conversions?: number;
  @Expose({ name: 'week_number' }) @IsOptional() @IsInt() weekNumber?: number;
  @Expose({ name: 'meeting_day' })
  @IsOptional()
  @IsIn(CASA_DE_PAZ_MEETING_DAYS)
  meetingDay?: string;
  @Expose({ name: 'meeting_time' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  meetingTime?: string;
}
