import { Expose } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLifeGroupTaskTemplateDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  // Markdown.
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  guidance?: string;

  @Expose({ name: 'is_active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLifeGroupTaskTemplateDto {
  @Expose()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  guidance?: string;

  @Expose({ name: 'is_active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderLifeGroupTaskTemplatesDto {
  @Expose({ name: 'template_ids' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  templateIds: number[];
}
