import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { FcmService } from './providers/fcm.service';
import { EmailService } from './providers/email.service';
import { SmsService } from './providers/sms.service';
import { WhatsAppService } from './providers/whatsapp.service';
import { UserDeviceTokensService } from '../users/user-device-tokens.service';
import { UserNotificationPreferencesService } from '../users/user-notification-preferences.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatchService,
    FcmService,
    EmailService,
    SmsService,
    WhatsAppService,
    UserDeviceTokensService,
    UserNotificationPreferencesService,
  ],
})
export class NotificationsModule {}
