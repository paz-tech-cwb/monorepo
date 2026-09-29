import { Expose } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateCasaDePazCycleDto {
  // "YYYY-MM" — normalized to the first day of the month by the service.
  @Expose() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month: string;
  @Expose() @IsOptional() @IsString() @Length(1, 120) name?: string;
}
