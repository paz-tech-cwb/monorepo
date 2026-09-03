// backend/src/users/dto/update-profile.dto.ts
import { Expose } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class UpdateProfileDto {
  @Expose()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  birth_date?: string;
}
