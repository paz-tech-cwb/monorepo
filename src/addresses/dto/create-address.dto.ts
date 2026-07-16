import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

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
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  number: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  complement: string;
}
