import { Expose } from 'class-transformer';
import { ArrayNotEmpty, IsInt, IsArray } from 'class-validator';

export class ReorderStepsDto {
  @Expose()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  step_ids: number[];
}
