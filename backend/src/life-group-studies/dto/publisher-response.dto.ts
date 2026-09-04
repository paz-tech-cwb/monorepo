import { Expose, Transform } from 'class-transformer';

export class PublisherResponseDto {
  @Expose()
  id: string;

  @Expose({ name: 'user_id' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.userId)
  userId: number;

  @Expose({ name: 'granted_by_id' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.grantedById)
  grantedById: number;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.createdAt)
  createdAt: Date;
}
