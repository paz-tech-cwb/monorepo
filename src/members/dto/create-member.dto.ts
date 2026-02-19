import { Expose } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateMemberDto {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsOptional()
  @IsString()
  phone?: string;

  @Expose()
  @IsOptional()
  @IsString()
  address?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @Expose()
  @IsOptional()
  @IsString()
  life_group?: string;

  @Expose()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
