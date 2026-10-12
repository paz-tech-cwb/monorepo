import { Expose } from 'class-transformer';
import { IsString, IsOptional, IsInt, IsIn, Min } from 'class-validator';

export class UpdateCourseDto {
  @Expose()
  @IsOptional()
  @IsString()
  title?: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsOptional()
  @IsString()
  creator?: string;

  @Expose()
  @IsOptional()
  @IsString()
  creator_id?: string | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  estimated_hours?: number;

  @Expose()
  @IsOptional()
  @IsIn(['teologia', 'lideranca', 'ministerio', 'discipulado'])
  category?: string;

  @Expose()
  @IsOptional()
  @IsString()
  url?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  image_url?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  thumbnail_url?: string | null;

  @Expose()
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;
}
