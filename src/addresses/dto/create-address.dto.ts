import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAddressDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}-?\d{3}$/)
  zip_code: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  country: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  state: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  city: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  neighborhood: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  street: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  number?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  complement?: string | null;
}
