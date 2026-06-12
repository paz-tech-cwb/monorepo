import { Expose } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  MinLength,
  Min,
} from 'class-validator';

export class CreateConversionDto {
  @Expose()
  @IsString()
  @MinLength(1)
  full_name: string;

  @Expose()
  @IsOptional()
  @IsString()
  cellphone?: string | null;

  @Expose()
  @IsIn(['primeira_vez', 'reconciliacao'])
  type: 'primeira_vez' | 'reconciliacao';

  @Expose()
  @IsOptional()
  @IsString()
  how_met_church?: string | null;

  @Expose()
  @IsOptional()
  @IsIn(['feminino', 'masculino'])
  sex?: 'feminino' | 'masculino' | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number | null;

  @Expose()
  @IsOptional()
  @IsIn(['solteiro', 'casado', 'divorciado', 'viuvo'])
  civil_status?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | null;

  @Expose() @IsOptional() @IsString() street?: string;
  @Expose() @IsOptional() @IsString() neighborhood?: string;
  @Expose() @IsOptional() @IsString() city?: string;
  @Expose({ name: 'culto_attendance' }) @IsOptional() @IsString() cultoAttendance?: string;
  @Expose({ name: 'life_group_status' }) @IsOptional() @IsString() lifeGroupStatus?: string;
  @Expose({ name: 'how_met_church_other' }) @IsOptional() @IsString() howMetChurchOther?: string;

  @Expose()
  @IsOptional()
  @IsString()
  church_attendance_history?: string | null;

  @Expose()
  @IsOptional()
  @IsIn(['sim', 'nao', 'ja_foi_convidado'])
  life_group_experience?: 'sim' | 'nao' | 'ja_foi_convidado' | null;

  @Expose()
  @IsOptional()
  @IsString()
  life_group_leader_name?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  who_invited?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  observations?: string | null;
}
