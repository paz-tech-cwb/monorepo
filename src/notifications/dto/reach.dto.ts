import { IsArray, IsEnum, IsIn, IsObject, ArrayMinSize } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { SegmentDto } from './create-notification.dto';
import type { NotificationCategory } from '../entities/notification.entity';

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
  @IsEnum(['events', 'announcements', 'life_group', 'academy', 'admin_alerts'])
  category: NotificationCategory;
}
