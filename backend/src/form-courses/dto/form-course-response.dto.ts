import { Expose, Transform } from 'class-transformer';

export class FormCourseResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description: string | null;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.isActive)
  isActive: boolean;

  @Expose({ name: 'display_order' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.display_order)
  displayOrder?: number;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.createdAt)
  createdAt: Date;

  @Expose({ name: 'updated_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.updatedAt)
  updatedAt: Date;
}
