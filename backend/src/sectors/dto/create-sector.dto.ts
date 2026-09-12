import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSectorDto {
  @Expose()
  @IsString()
  @MinLength(1)
  name: string;

  @Expose()
  @IsOptional()
  @IsInt()
  area_id?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  leader_id?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  co_leader_id?: number;
}
