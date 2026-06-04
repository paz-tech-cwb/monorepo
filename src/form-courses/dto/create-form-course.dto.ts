import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateFormCourseDto {
  @Expose() @IsString() name: string;
  @Expose() @IsOptional() @IsString() description?: string;
  @Expose({ name: 'is_active' }) @IsOptional() @IsBoolean() isActive?: boolean;
  @Expose({ name: 'display_order' })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
