import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class QuestionnaireAnswerDto {
  @Expose()
  @IsUUID()
  question_id: string;

  @Expose()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  option_ids?: string[];

  @Expose()
  @IsOptional()
  @IsString()
  text?: string;
}

export class SubmitQuestionnaireDto {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionnaireAnswerDto)
  answers: QuestionnaireAnswerDto[];
}
