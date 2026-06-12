import { Expose } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateMemberRegistrationDto {
  @Expose({ name: 'full_name' }) @IsString() @Length(2, 180) fullName: string;
  @Expose({ name: 'birth_date' }) @IsDateString() birthDate: string;
  @Expose() @IsString() @Matches(/^\+?[0-9]{8,15}$/) phone: string;
  @Expose() @IsIn(['m', 'f']) gender: string;
  @Expose({ name: 'civil_state' })
  @IsIn(['solteiro', 'casado', 'divorciado', 'viuvo'])
  civilState: string;
  @Expose({ name: 'sector_id' }) @IsInt() sectorId: number;
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
  @Expose() @IsOptional() @IsString() address?: string;
  @Expose({ name: 'life_group_id' })
  @IsOptional()
  @IsInt()
  lifeGroupId?: number;
  @Expose({ name: 'discipulador_name' }) @IsOptional() @IsString() discipuladorName?: string;
  @Expose({ name: 'completed_courses' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  completedCourses?: string[];
}
