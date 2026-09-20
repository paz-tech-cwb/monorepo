import { Expose } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

export class CasaDePazSummaryQueryDto {
  @Expose()
  @IsOptional()
  @IsDateString()
  from?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  to?: string;
}
