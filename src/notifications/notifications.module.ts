import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { FcmService } from './providers/fcm.service';
import { EmailService } from './providers/email.service';
import { SmsService } from './providers/sms.service';
import { WhatsAppService } from './providers/whatsapp.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDispatchService, FcmService, EmailService, SmsService, WhatsAppService],
})
export class NotificationsModule {}
