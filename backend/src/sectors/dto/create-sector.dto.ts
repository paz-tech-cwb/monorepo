import { Expose } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class CreateSectorDto {
  @Expose()
  @IsString()
  @MinLength(1)
  name: string;
}
