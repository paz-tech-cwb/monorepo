import { Expose, Transform } from 'class-transformer';

export class AnnouncementResponseDto {
  @Expose()
  id: number;

  @Expose({ name: 'image_url' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.imageUrl)
  imageUrl: string;

  @Expose()
  title: string;

  @Expose()
  subtitle: string;

  @Expose({ name: 'markdown_content' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.markdownContent)
  markdownContent: string;

  @Expose({ name: 'action_url' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.actionUrl)
  actionUrl?: string;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.createdAt)
  createdAt: Date;

  @Expose({ name: 'updated_at' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.updatedAt)
  updatedAt: Date;
}
