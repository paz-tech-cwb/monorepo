// backend/src/users/dto/update-profile.dto.ts
import { Expose, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { CreateAddressDto } from '../../addresses/dto/create-address.dto';

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

  @Expose()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
