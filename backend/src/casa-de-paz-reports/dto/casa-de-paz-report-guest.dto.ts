import { Expose } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CasaDePazReportGuestDto {
  @Expose() @IsString() @Length(1, 180) name: string;
  @Expose() @IsEmail() email: string;
  @Expose({ name: 'birth_date' }) @IsDateString() birthDate: string;
  @Expose() @IsOptional() @IsString() @Length(1, 32) whatsapp?: string;
}
