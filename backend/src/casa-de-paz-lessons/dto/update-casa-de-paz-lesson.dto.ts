import { Expose } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateCasaDePazLessonDto {
  @Expose() @IsOptional() @IsString() @Length(1, 160) title?: string;
  @Expose() @IsOptional() @IsString() summary?: string;
  @Expose() @IsOptional() @IsString() guidelines?: string;

  @Expose()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Length(1, 500, { each: true })
  questions?: string[];

  @Expose({ name: 'youtube_url' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  youtube_url?: string;
}
