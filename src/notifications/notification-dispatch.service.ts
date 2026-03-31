import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  Notification,
  NotificationCategory,
} from './entities/notification.entity';
import { UserNotificationPreferences } from '../users/entities/user-notification-preferences.entity';
import { User } from '../users/entities/user.entity';
import { FcmService } from './providers/fcm.service';
import { EmailService } from './providers/email.service';
import { SmsService } from './providers/sms.service';
import { WhatsAppService } from './providers/whatsapp.service';

const CATEGORY_PREF_MAP: Record<
  NotificationCategory,
  keyof UserNotificationPreferences
> = {
  events: 'eventsEnabled',
  announcements: 'announcementsEnabled',
  life_group: 'lifeGroupEnabled',
  academy: 'academyEnabled',
  admin_alerts: 'adminAlertsEnabled',
};

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly fcmService: FcmService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async dispatch(notification: Notification, users: User[]): Promise<void> {
    await this.entityManager.update(Notification, notification.id, {
      status: 'processing',
    });

    if (users.length === 0) {
      await this.entityManager.update(Notification, notification.id, {
        status: 'sent',
        recipientsCount: 0,
        sentAt: new Date(),
      });
      return;
    }

    let successCount = 0;

    for (const user of users) {
      const prefs = await this.entityManager.findOne(
        UserNotificationPreferences,
        {
          where: { user: { id: user.id } },
        },
      );

      // If no prefs row, treat as all-enabled (default)
      if (prefs && !prefs.allNotificationsEnabled) continue;

      const categoryKey = CATEGORY_PREF_MAP[notification.category];
      if (prefs && !prefs[categoryKey]) continue;

      const activeChannels = notification.channels.filter((ch) => {
        if (!prefs) return true;
        if (ch === 'push') return prefs.pushEnabled;
        if (ch === 'email') return prefs.emailEnabled;
        if (ch === 'sms') return prefs.smsEnabled;
        if (ch === 'whatsapp') return prefs.whatsappEnabled;
        return true;
      });

      if (activeChannels.length === 0) continue;

      const results = await Promise.all(
        activeChannels.map((ch) => this.sendChannel(ch, user, notification)),
      );

      if (results.some(Boolean)) successCount++;
    }

    await this.entityManager.update(Notification, notification.id, {
      status: successCount > 0 ? 'sent' : 'failed',
      recipientsCount: successCount,
      sentAt: new Date(),
    });

    this.logger.log(
      `Notification #${notification.id} dispatched: ${successCount}/${users.length} recipients reached`,
    );
  }

  private sendChannel(
    channel: string,
    user: User,
    notification: Notification,
  ): Promise<boolean> {
    const payload = { title: notification.title, body: notification.message };
    switch (channel) {
      case 'push':
        return this.fcmService.sendToUser(user.id, payload);
      case 'email':
        return this.emailService.sendToUser(user.email, payload);
      case 'sms':
        return this.smsService.sendToUser(user.phoneNumber, payload);
      case 'whatsapp':
        return this.whatsAppService.sendToUser(user.phoneNumber, payload);
      default:
        return Promise.resolve(false);
    }
  }
}
