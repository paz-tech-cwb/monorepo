import { Expose } from 'class-transformer';
import { IsString, IsOptional, IsInt, MinLength } from 'class-validator';

export class CreateLifeGroupDto {
  @Expose()
  @IsString()
  @MinLength(1)
  name: string;

  @Expose()
  @IsOptional()
  @IsInt()
  leader_id?: number | null;

  @Expose()
  @IsOptional()
  @IsInt()
  co_leader_id?: number | null;

  @Expose()
  @IsOptional()
  @IsInt()
  sector_id?: number | null;

  @Expose()
  @IsOptional()
  @IsString()
  location?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  meeting_day?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  meeting_time?: string | null;
}
