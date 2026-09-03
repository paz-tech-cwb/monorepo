import { Expose } from 'class-transformer';
import { IsString, IsArray } from 'class-validator';

export class SendNotificationDto {
  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  message: string;

  @Expose()
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @Expose()
  @IsString()
  target_audience: string;
}
