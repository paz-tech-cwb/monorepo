import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateNotificationPreferencesDto {
  @Expose() @IsOptional() @IsBoolean() all_notifications_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() push_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() email_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() sms_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() whatsapp_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() events_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() announcements_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() life_group_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() academy_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() admin_alerts_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() member_journey_enabled?: boolean;
  @Expose() @IsOptional() @IsBoolean() contributions_enabled?: boolean;
  @Expose()
  @IsOptional()
  @IsString()
  @IsIn(['granted', 'denied', 'not_determined'])
  os_permission_status?: string;
}
