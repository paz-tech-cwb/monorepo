import { Expose } from 'class-transformer';
import { IsString, IsOptional, IsInt, IsIn, IsUrl, Min } from 'class-validator';

export class CreateCourseDto {
  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  description: string;

  @Expose()
  @IsString()
  creator: string;

  @Expose()
  @IsOptional()
  @IsString()
  creator_id?: string | null;

  @Expose()
  @IsInt()
  @Min(0)
  estimated_hours: number;

  @Expose()
  @IsIn(['teologia', 'lideranca', 'ministerio', 'discipulado'])
  category: string;

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
