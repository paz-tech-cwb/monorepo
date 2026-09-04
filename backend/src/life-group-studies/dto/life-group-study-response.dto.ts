import { Expose, Transform } from 'class-transformer';

export class LifeGroupStudyResponseDto {
  @Expose()
  id: string;

  @Expose({ name: 'image_url' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.imageUrl)
  imageUrl: string | null;

  @Expose()
  title: string;

  @Expose()
  author: string;

  @Expose({ name: 'body_markdown' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.bodyMarkdown)
  bodyMarkdown: string;

  @Expose({ name: 'published_by_id' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.publishedById)
  publishedById: number;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.createdAt)
  createdAt: Date;

  @Expose({ name: 'updated_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.updatedAt)
  updatedAt: Date;
}
