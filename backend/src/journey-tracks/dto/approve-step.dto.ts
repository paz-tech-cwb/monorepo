import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveStepDto {
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
