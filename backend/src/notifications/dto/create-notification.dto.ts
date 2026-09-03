import {
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '../notification-category';

export class SegmentFiltersDto {
  @Expose() @IsOptional() @IsArray() roles?: string[];
  @Expose() @IsOptional() @IsArray() sector_ids?: number[];
  @Expose() @IsOptional() @IsArray() life_group_ids?: number[];
  @Expose() @IsOptional() @IsIn(['active', 'inactive']) status?:
    | 'active'
    | 'inactive';
}

export class SegmentDto {
  @Expose()
  @IsIn(['all', 'filtered'])
  type: 'all' | 'filtered';

  @Expose()
  @IsOptional()
  @IsObject()
  @Type(() => SegmentFiltersDto)
  filters?: SegmentFiltersDto;
}

export class CreateNotificationDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  message: string;

  @Expose()
  @IsEnum(NOTIFICATION_CATEGORIES)
  category: NotificationCategory;

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
  @IsOptional()
  @IsISO8601()
  scheduled_at?: string | null;
}
