import { Expose } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class CreateAreaDto {
  @Expose()
  @IsString()
  @MinLength(1)
  name: string;
}
