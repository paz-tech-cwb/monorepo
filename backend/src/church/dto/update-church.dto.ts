import { Expose } from 'class-transformer';
import { IsBoolean, IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateChurchDto {
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @IsOptional()
  @IsString()
  slug?: string | null;

  @Expose({ name: 'is_active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string | null;

  @Expose()
  @IsOptional()
  @IsObject()
  address?: Record<string, string | null>;

  @Expose()
  @IsOptional()
  @IsObject()
  contact?: Record<string, string>;

  @Expose()
  @IsOptional()
  @IsObject()
  schedule?: Record<string, Record<string, string>>;

  @Expose()
  @IsOptional()
  @IsObject()
  social_media?: Record<string, string | undefined>;
}
