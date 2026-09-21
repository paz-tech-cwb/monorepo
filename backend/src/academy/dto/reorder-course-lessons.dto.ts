import { Expose } from 'class-transformer';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderCourseLessonsDto {
  @Expose()
  @IsArray()
  @IsUUID('4', { each: true })
  lesson_ids: string[];
}
