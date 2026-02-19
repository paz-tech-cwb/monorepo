import { Expose } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsIn,
} from 'class-validator';
import { VALID_ROLE_SLUGS } from './update-user-role.dto';

export class CreateUserDto {
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
  @IsDateString()
  birth_date?: string;

  @Expose()
  @IsOptional()
  @IsString()
  life_group?: string;

  @Expose()
  @IsOptional()
  @IsIn(VALID_ROLE_SLUGS)
  role?: string;
}
