import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourseLessonDto {
  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string | null;

  @Expose()
  @IsString()
  youtube_video_id: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_seconds?: number | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
