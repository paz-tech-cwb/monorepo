import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Brackets, EntityManager, SelectQueryBuilder } from 'typeorm';
import {
  Notification,
  NotificationSegment,
} from './entities/notification.entity';
import { NotificationDispatchService } from './notification-dispatch.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { User } from '../users/entities/user.entity';
import { UserNotificationPreferences } from '../users/entities/user-notification-preferences.entity';
import { UserDeviceToken } from '../users/entities/user-device-token.entity';

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  // ── Bootstrap: recover scheduled notifications after restart ─────────────
  async onApplicationBootstrap(): Promise<void> {
    const now = new Date();

    // Re-register future scheduled notifications (scheduled_at > now)
    const future = await this.entityManager
      .createQueryBuilder(Notification, 'n')
      .where("n.status = 'scheduled' AND n.scheduled_at > :now", { now })
      .getMany();
    for (const n of future) {
      this.scheduleTimer(n);
    }

    // Dispatch missed scheduled notifications immediately (scheduled_at <= now)
    const missed = await this.entityManager
      .createQueryBuilder(Notification, 'n')
      .where("n.status = 'scheduled' AND n.scheduled_at <= :now", { now })
      .getMany();

    for (const n of missed) {
      setImmediate(() => this.runDispatch(n));
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async create(dto: CreateNotificationDto, creatorId: number) {
    const leaderOnlyCategories: string[] = [
      'forms',
      'meeting_reports',
      'life_group_study',
    ];
    if (leaderOnlyCategories.includes(dto.category)) {
      const roles = dto.segment?.filters?.roles;
      if (dto.segment?.type !== 'filtered' || !roles || roles.length === 0) {
        throw new BadRequestException(
          `Category '${dto.category}' requires a filtered segment with at least one role`,
        );
      }
    }

    const isScheduled = !!dto.scheduled_at;

    if (isScheduled) {
      const scheduledAt = new Date(dto.scheduled_at!);
      if (scheduledAt <= new Date()) {
        throw new UnprocessableEntityException(
          'scheduled_at must be in the future',
        );
      }
    }

    const notification = this.entityManager.create(Notification, {
      title: dto.title,
      message: dto.message,
      category: dto.category,
      channels: dto.channels,
      segment: dto.segment,
      status: isScheduled ? 'scheduled' : 'pending',
      scheduledAt: isScheduled ? new Date(dto.scheduled_at!) : null,
      createdBy: { id: creatorId },
    });

    const saved = await this.entityManager.save(notification);

    if (isScheduled) {
      this.scheduleTimer(saved);
    } else {
      setImmediate(() => this.runDispatch(saved));
    }

    return this.toResponse(saved);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  async findAll(origin?: 'manual' | 'automatic') {
    const notifications = await this.entityManager.find(Notification, {
      relations: ['createdBy'],
      where: origin ? { origin } : {},
      order: { createdAt: 'DESC' },
    });
    return notifications.map((n) => this.toResponse(n));
  }

  async findOne(id: number) {
    const n = await this.entityManager.findOne(Notification, {
      where: { id },
      relations: ['createdBy'],
    });
    if (!n) throw new NotFoundException(`Notification #${id} not found`);
    return this.toResponse(n);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async remove(id: number): Promise<void> {
    const n = await this.entityManager.findOne(Notification, { where: { id } });
    if (!n) throw new NotFoundException(`Notification #${id} not found`);
    if (!['pending', 'scheduled'].includes(n.status)) {
      throw new ConflictException(
        'Only pending or scheduled notifications can be deleted',
      );
    }
    await this.entityManager.remove(n);
  }

  // ── Reach preview ─────────────────────────────────────────────────────────
  async getReach(
    segment: NotificationSegment,
    channels: string[],
    category: string,
  ): Promise<{
    total: number;
    by_channel: Record<string, number>;
    excluded: Record<string, number>;
  }> {
    const users = await this.resolveSegment(segment);
    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) {
      const by_channel: Record<string, number> = {};
      const excluded: Record<string, number> = {};
      for (const ch of channels) {
        by_channel[ch] = 0;
        excluded[ch] = 0;
      }
      return { total: 0, by_channel, excluded };
    }

    // Load preferences for all users at once
    const allPrefs = await this.entityManager.find(
      UserNotificationPreferences,
      {
        where: userIds.map((id) => ({ user: { id } })),
        relations: ['user'],
      },
    );
    const prefsMap = new Map(allPrefs.map((p) => [p.user.id, p]));

    // Users with at least one registered device token (push deliverability)
    const tokenRows = await this.entityManager
      .createQueryBuilder(UserDeviceToken, 'dt')
      .select('DISTINCT dt.user_id', 'userId')
      .where('dt.user_id IN (:...userIds)', { userIds })
      .getRawMany<{ userId: number }>();
    const usersWithToken = new Set(tokenRows.map((r) => Number(r.userId)));

    const CATEGORY_PREF_MAP: Partial<
      Record<string, keyof UserNotificationPreferences>
    > = {
      events: 'eventsEnabled',
      announcements: 'announcementsEnabled',
      life_group: 'lifeGroupEnabled',
      academy: 'academyEnabled',
      member_journey: 'memberJourneyEnabled',
      contributions: 'contributionsEnabled',
    };
    const categoryPrefKey = CATEGORY_PREF_MAP[category];

    const CHANNEL_PREF_MAP: Record<string, keyof UserNotificationPreferences> =
      {
        push: 'pushEnabled',
        email: 'emailEnabled',
        sms: 'smsEnabled',
        whatsapp: 'whatsappEnabled',
      };

    const by_channel: Record<string, number> = {};
    const excluded: Record<string, number> = {};
    for (const ch of channels) {
      by_channel[ch] = 0;
      excluded[ch] = 0;
    }

    const totalReached = new Set<number>();

    for (const userId of userIds) {
      const prefs = prefsMap.get(userId);
      if (prefs && !prefs.allNotificationsEnabled) continue;
      if (prefs && categoryPrefKey && !prefs[categoryPrefKey]) continue;

      for (const ch of channels) {
        const chPrefKey = CHANNEL_PREF_MAP[ch];
        if (prefs && chPrefKey && !prefs[chPrefKey]) {
          excluded[ch] = (excluded[ch] ?? 0) + 1;
          continue;
        }
        // Push is only deliverable to users with a registered device token
        if (ch === 'push' && !usersWithToken.has(userId)) {
          continue;
        }
        by_channel[ch] = (by_channel[ch] ?? 0) + 1;
        totalReached.add(userId);
      }
    }

    return { total: totalReached.size, by_channel, excluded };
  }

  // ── Internal helpers ──────────────────────────────────────────────────────
  private async runDispatch(notification: Notification): Promise<void> {
    const users = await this.resolveSegment(notification.segment);
    await this.dispatchService.dispatch(notification, users);
  }

  private scheduleTimer(notification: Notification): void {
    const delay = notification.scheduledAt!.getTime() - Date.now();
    setTimeout(() => this.runDispatch(notification), Math.max(delay, 0));
  }

  private async resolveSegment(segment: NotificationSegment): Promise<User[]> {
    // role is a ManyToOne relation to Role entity with a slug field
    const qb: SelectQueryBuilder<User> = this.entityManager
      .createQueryBuilder(User, 'u')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('u.sector', 'sector')
      .leftJoinAndSelect('u.lifeGroups', 'lifeGroup');

    if (segment.type === 'filtered' && segment.filters) {
      const { roles, sector_ids, life_group_ids, status, user_ids } =
        segment.filters;

      if (status) {
        qb.andWhere('u.status = :status', { status });
      }

      // The role/sector/life-group filters are combined with AND. Explicit
      // user ids (e.g. life group co-leaders, who have no dedicated role
      // slug) are unioned in as an alternative match so they are not
      // excluded by those AND filters.
      qb.andWhere(
        new Brackets((qbInner) => {
          let hasMatchFilter = false;

          if (roles && roles.length > 0) {
            qbInner.andWhere('role.slug IN (:...roles)', { roles });
            hasMatchFilter = true;
          }
          if (sector_ids && sector_ids.length > 0) {
            qbInner.andWhere('sector.id IN (:...sectorIds)', {
              sectorIds: sector_ids,
            });
            hasMatchFilter = true;
          }
          if (life_group_ids && life_group_ids.length > 0) {
            qbInner.andWhere('lifeGroup.id IN (:...lgIds)', {
              lgIds: life_group_ids,
            });
            hasMatchFilter = true;
          }

          if (user_ids && user_ids.length > 0) {
            if (hasMatchFilter) {
              qbInner.orWhere('u.id IN (:...userIds)', { userIds: user_ids });
            } else {
              qbInner.andWhere('u.id IN (:...userIds)', {
                userIds: user_ids,
              });
            }
            hasMatchFilter = true;
          }

          if (!hasMatchFilter) {
            qbInner.andWhere('1=1');
          }
        }),
      );
    }

    return qb.getMany();
  }

  private toResponse(n: Notification) {
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      category: n.category,
      channels: n.channels,
      segment: n.segment,
      recipients_count: n.recipientsCount,
      recipients_by_channel: n.recipientsByChannel ?? null,
      status: n.status,
      origin: n.origin,
      scheduled_at: n.scheduledAt,
      sent_at: n.sentAt,
      created_by: n.createdBy?.id ?? null,
      created_at: n.createdAt,
    };
  }
}
