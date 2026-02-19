import { Expose } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsIn,
} from 'class-validator';

export class UpdateUserDto {
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @IsOptional()
  @IsEmail()
  email?: string;

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
  @IsIn(['admin', 'pastor', 'supervisor', 'lg-leader', 'member'])
  role?: string;

  @Expose()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @Expose()
  @IsOptional()
  @IsString()
  avatar?: string;
}
