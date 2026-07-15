import { IsArray, IsEnum, IsIn, IsObject, ArrayMinSize } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { SegmentDto } from './create-notification.dto';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '../notification-category';

export class ReachDto {
  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['push', 'email', 'sms', 'whatsapp'], { each: true })
  channels: string[];

  @Expose()
  @IsObject()
  @Type(() => SegmentDto)
  segment: SegmentDto;

  @Expose()
  @IsEnum(NOTIFICATION_CATEGORIES)
  category: NotificationCategory;
}
