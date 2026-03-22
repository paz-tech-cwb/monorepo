import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserNotificationPreferences } from './entities/user-notification-preferences.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class UserNotificationPreferencesService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getOrCreate(userId: number): Promise<UserNotificationPreferences> {
    const existing = await this.entityManager.findOne(UserNotificationPreferences, {
      where: { user: { id: userId } },
    });
    if (existing) return existing;

    const created = this.entityManager.create(UserNotificationPreferences, {
      user: { id: userId },
    });
    return this.entityManager.save(created);
  }

  async update(
    userId: number,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreferences> {
    const prefs = await this.getOrCreate(userId);
    const updates: Partial<UserNotificationPreferences> = {};
    if (dto.all_notifications_enabled !== undefined)
      updates.allNotificationsEnabled = dto.all_notifications_enabled;
    if (dto.push_enabled !== undefined) updates.pushEnabled = dto.push_enabled;
    if (dto.email_enabled !== undefined) updates.emailEnabled = dto.email_enabled;
    if (dto.sms_enabled !== undefined) updates.smsEnabled = dto.sms_enabled;
    if (dto.whatsapp_enabled !== undefined) updates.whatsappEnabled = dto.whatsapp_enabled;
    if (dto.events_enabled !== undefined) updates.eventsEnabled = dto.events_enabled;
    if (dto.announcements_enabled !== undefined)
      updates.announcementsEnabled = dto.announcements_enabled;
    if (dto.life_group_enabled !== undefined) updates.lifeGroupEnabled = dto.life_group_enabled;
    if (dto.academy_enabled !== undefined) updates.academyEnabled = dto.academy_enabled;
    if (dto.admin_alerts_enabled !== undefined)
      updates.adminAlertsEnabled = dto.admin_alerts_enabled;
    Object.assign(prefs, updates);
    return this.entityManager.save(prefs);
  }

  toResponse(prefs: UserNotificationPreferences) {
    return {
      all_notifications_enabled: prefs.allNotificationsEnabled,
      push_enabled: prefs.pushEnabled,
      email_enabled: prefs.emailEnabled,
      sms_enabled: prefs.smsEnabled,
      whatsapp_enabled: prefs.whatsappEnabled,
      events_enabled: prefs.eventsEnabled,
      announcements_enabled: prefs.announcementsEnabled,
      life_group_enabled: prefs.lifeGroupEnabled,
      academy_enabled: prefs.academyEnabled,
      admin_alerts_enabled: prefs.adminAlertsEnabled,
    };
  }
}
