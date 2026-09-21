import { Expose } from 'class-transformer';
import { IsArray, IsUUID } from 'class-validator';

export class SetTrackCoursesDto {
  @Expose()
  @IsArray()
  @IsUUID('4', { each: true })
  course_ids: string[];
}
