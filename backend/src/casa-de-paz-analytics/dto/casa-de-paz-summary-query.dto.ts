import { IsDateString, IsOptional } from 'class-validator';

export class CasaDePazSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
