import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @Expose()
  @IsString()
  imageUrl: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  subtitle: string;

  @Expose()
  @IsString()
  markdownContent: string;

  @Expose()
  @IsString()
  actionUrl: string;
}
