import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @Expose({ name: 'image_url' })
  @IsString()
  imageUrl: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  subtitle: string;

  @Expose({ name: 'markdown_content' })
  @IsString()
  markdownContent: string;

  @Expose({ name: 'action_url' })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}
