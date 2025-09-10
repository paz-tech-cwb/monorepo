import { IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  imageUrl: string;

  @IsString()
  title: string;

  @IsString()
  subtitle: string;

  @IsString()
  markdownContent: string;

  @IsString()
  actionUrl: string;
}
