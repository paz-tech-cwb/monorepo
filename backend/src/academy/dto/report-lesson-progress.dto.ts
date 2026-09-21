import { Expose } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ReportLessonProgressDto {
  @Expose()
  @IsInt()
  @Min(0)
  watched_percentage: number;

  @Expose()
  @IsInt()
  @Min(0)
  position_seconds: number;
}
