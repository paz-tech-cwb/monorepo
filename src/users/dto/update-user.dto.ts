import { Expose } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsIn,
  IsNumber,
  IsArray,
} from 'class-validator';
import { VALID_ROLE_SLUGS } from './update-user-role.dto';

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
  @IsDateString()
  birth_date?: string;

  @Expose({ name: 'sector_id' })
  @IsOptional()
  @IsNumber()
  sectorId?: number;

  @Expose({ name: 'completed_courses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completedCourses?: string[];

  @Expose()
  @IsOptional()
  @IsIn(VALID_ROLE_SLUGS)
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
