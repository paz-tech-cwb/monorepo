import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(notification: Notification) {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      channels: notification.channels,
      segment: notification.segment,
      recipients_count: notification.recipientsCount,
      status: notification.status,
      sent_at: notification.sentAt,
    };
  }

  async send(dto: SendNotificationDto) {
    try {
      const notification = this.entityManager.create(Notification, {
        title: dto.title,
        message: dto.message,
        channels: dto.channels,
        segment: { type: 'all' },
        recipientsCount: 0,
        status: 'sent',
        sentAt: new Date(),
      });
      const saved = await this.entityManager.save(notification);
      return this.toResponse(saved);
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while sending the notification.',
      );
    }
  }

  async findAll() {
    try {
      const notifications = await this.entityManager.find(Notification, {
        order: { sentAt: 'DESC', createdAt: 'DESC' },
      });
      return notifications.map((n) => this.toResponse(n));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving notifications.',
      );
    }
  }

  async findOne(id: number) {
    const notification = await this.entityManager.findOne(Notification, {
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return this.toResponse(notification);
  }

  async findOneEntity(id: number): Promise<Notification> {
    const notification = await this.entityManager.findOne(Notification, {
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async remove(id: number): Promise<void> {
    const notification = await this.findOneEntity(id);
    await this.entityManager.remove(Notification, notification);
  }
}
