import { Expose } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateLifeGroupStudyDto {
  @Expose({ name: 'image_url' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author: string;

  @Expose({ name: 'body_markdown' })
  @IsString()
  @MinLength(1)
  bodyMarkdown: string;
}
