import { Expose } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateJourneyTrackDto {
  @Expose()
  @IsOptional()
  @IsString()
  title?: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  eligibility_text?: string | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @Expose()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
