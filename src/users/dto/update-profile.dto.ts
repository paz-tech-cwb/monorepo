// backend/src/users/dto/update-profile.dto.ts
import { Expose } from 'class-transformer';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @IsOptional()
  @IsString()
  phone?: string;

  @Expose({ name: 'birth_date' })
  @IsOptional()
  @IsDateString()
  birth_date?: string;
}
