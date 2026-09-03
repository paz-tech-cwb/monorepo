import { Expose } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateFormConversionDto {
  @Expose({ name: 'full_name' }) @IsString() fullName: string;
  @Expose() @IsString() email: string;
  @Expose() @IsString() @Matches(/^\+?[0-9]{8,15}$/) phone: string;
  @Expose({ name: 'decision_type' })
  @IsIn(['first_time', 'reconciliation'])
  decisionType: string;
  @Expose({ name: 'how_met_church' }) @IsString() howMetChurch: string;
  @Expose({ name: 'how_met_church_other' })
  @IsOptional()
  @IsString()
  howMetChurchOther?: string;
  @Expose() @IsIn(['m', 'f']) gender: string;
  @Expose({ name: 'birth_date' }) @IsDateString() birthDate: string;
  @Expose({ name: 'civil_state' })
  @IsIn(['solteiro', 'casado', 'divorciado', 'viuvo'])
  civilState: string;
  @Expose() @IsOptional() @IsString() cep?: string;
  @Expose() @IsOptional() @IsString() street?: string;
  @Expose({ name: 'address_number' })
  @IsOptional()
  @IsString()
  addressNumber?: string;
  @Expose() @IsOptional() @IsString() complement?: string;
  @Expose() @IsOptional() @IsString() neighborhood?: string;
  @Expose() @IsOptional() @IsString() city?: string;
  @Expose() @IsOptional() @IsString() state?: string;
  @Expose() @IsString() address: string;
  @Expose({ name: 'attendance_count' }) @IsString() attendanceCount: string;
  @Expose({ name: 'life_group_status' }) @IsString() lifeGroupStatus: string;
  @Expose({ name: 'life_group_leader_or_name' })
  @IsOptional()
  @IsString()
  lifeGroupLeaderOrName?: string;
  @Expose({ name: 'invited_by' }) @IsOptional() @IsString() invitedBy?: string;
  @Expose() @IsOptional() @IsString() notes?: string;
}
