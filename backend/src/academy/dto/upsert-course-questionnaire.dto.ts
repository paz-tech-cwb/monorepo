import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertCourseQuestionOptionDto {
  @Expose()
  @IsOptional()
  @IsString()
  id?: string;

  @Expose()
  @IsString()
  text: string;

  @Expose()
  @IsBoolean()
  is_correct: boolean;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}

export class UpsertCourseQuestionDto {
  @Expose()
  @IsOptional()
  @IsString()
  id?: string;

  @Expose()
  @IsString()
  text: string;

  @Expose()
  @IsIn(['single_choice', 'multiple_choice', 'free_text'])
  type: 'single_choice' | 'multiple_choice' | 'free_text';

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertCourseQuestionOptionDto)
  options?: UpsertCourseQuestionOptionDto[];
}

export class UpsertCourseQuestionnaireDto {
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
  passing_score_percentage?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  max_attempts?: number | null;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertCourseQuestionDto)
  questions: UpsertCourseQuestionDto[];
}
