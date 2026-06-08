import { Expose, Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class CreateEventDto {
  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsDateString()
  initial_date: string;

  @Expose()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  @IsOptional()
  final_date?: string;

  @Expose()
  @Transform(emptyStringToUndefined)
  @IsString()
  @IsOptional()
  description?: string;

  @Expose()
  @Transform(emptyStringToUndefined)
  @IsString()
  @IsOptional()
  recurrence_type?: string;

  @Expose()
  @Transform(emptyStringToUndefined)
  @IsString()
  @IsOptional()
  image?: string;
}
