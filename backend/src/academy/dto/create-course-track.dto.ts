import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourseTrackDto {
  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
