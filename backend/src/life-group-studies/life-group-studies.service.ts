import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LifeGroupStudy } from './entities/life-group-study.entity';
import { LifeGroupStudyPublisher } from './entities/life-group-study-publisher.entity';
import { CreateLifeGroupStudyDto } from './dto/create-life-group-study.dto';
import { UpdateLifeGroupStudyDto } from './dto/update-life-group-study.dto';
import { User } from '../users/entities/user.entity';
import {
  LifeGroupStudyAccessService,
  LIFE_GROUP_STUDY_LEADERSHIP_ROLES,
} from './life-group-study-access.service';
import {
  Notification,
  NotificationCategory,
} from '../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

@Injectable()
export class LifeGroupStudiesService {
  private readonly logger = new Logger(LifeGroupStudiesService.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly accessService: LifeGroupStudyAccessService,
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  async create(
    dto: CreateLifeGroupStudyDto,
    user: User,
  ): Promise<LifeGroupStudy> {
    const canPublish = await this.accessService.canPublish(user);
    if (!canPublish) {
      throw new ForbiddenException(
        'You are not allowed to publish Estudo do Life content.',
      );
    }

    let saved: LifeGroupStudy;
    try {
      const study = this.entityManager.create(LifeGroupStudy, {
        imageUrl: dto.imageUrl ?? null,
        title: dto.title,
        author: dto.author,
        bodyMarkdown: dto.bodyMarkdown,
        publishedById: user.id,
      });
      saved = await this.entityManager.save(study);
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) throw error;
      throw new BadRequestException(
        'An error occurred while creating the Estudo do Life.',
      );
    }

    // The study is already persisted at this point. A failure to dispatch
    // the leadership notification must not surface as a failed create
    // request (which would prompt client retries and duplicate studies).
    try {
      await this.notifyLeadership(saved);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to notify leadership for Estudo do Life ${saved.id}: ${message}`,
      );
    }

    return saved;
  }

  async findAllPaginated(
    user: User,
    page: number,
    limit: number,
  ): Promise<Paginated<LifeGroupStudy>> {
    const canView = await this.accessService.canView(user);
    if (!canView) {
      throw new ForbiddenException(
        'You must belong to a life group to view Estudo do Life content.',
      );
    }

    const [data, total] = await this.entityManager.findAndCount(
      LifeGroupStudy,
      {
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string, user: User): Promise<LifeGroupStudy> {
    const canView = await this.accessService.canView(user);
    if (!canView) {
      throw new ForbiddenException(
        'You must belong to a life group to view Estudo do Life content.',
      );
    }

    const study = await this.entityManager.findOne(LifeGroupStudy, {
      where: { id },
    });
    if (!study) {
      throw new NotFoundException(`Estudo do Life with ID ${id} not found`);
    }
    return study;
  }

  async update(
    id: string,
    dto: UpdateLifeGroupStudyDto,
    user: User,
  ): Promise<LifeGroupStudy> {
    const study = await this.findOneEntity(id);
    this.assertOwnerOrAdmin(study, user);

    Object.assign(study, {
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.author !== undefined ? { author: dto.author } : {}),
      ...(dto.bodyMarkdown !== undefined
        ? { bodyMarkdown: dto.bodyMarkdown }
        : {}),
    });

    return this.entityManager.save(LifeGroupStudy, study);
  }

  async remove(id: string, user: User): Promise<void> {
    const study = await this.findOneEntity(id);
    this.assertOwnerOrAdmin(study, user);
    await this.entityManager.remove(LifeGroupStudy, study);
  }

  // ── Publisher grant management ───────────────────────────────────────────

  async listPublishers(): Promise<LifeGroupStudyPublisher[]> {
    return this.entityManager.find(LifeGroupStudyPublisher, {
      order: { createdAt: 'DESC' },
    });
  }

  async grantPublisher(
    userId: number,
    grantedById: number,
  ): Promise<LifeGroupStudyPublisher> {
    const targetUser = await this.entityManager.findOne(User, {
      where: { id: userId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const existing = await this.entityManager.findOne(LifeGroupStudyPublisher, {
      where: { userId },
    });
    if (existing) return existing;

    const grant = this.entityManager.create(LifeGroupStudyPublisher, {
      userId,
      grantedById,
    });
    return this.entityManager.save(grant);
  }

  async revokePublisher(userId: number): Promise<void> {
    const existing = await this.entityManager.findOne(LifeGroupStudyPublisher, {
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException(
        `No Estudo do Life publisher grant found for user ${userId}`,
      );
    }
    await this.entityManager.remove(LifeGroupStudyPublisher, existing);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private async findOneEntity(id: string): Promise<LifeGroupStudy> {
    const study = await this.entityManager.findOne(LifeGroupStudy, {
      where: { id },
    });
    if (!study) {
      throw new NotFoundException(`Estudo do Life with ID ${id} not found`);
    }
    return study;
  }

  private assertOwnerOrAdmin(study: LifeGroupStudy, user: User): void {
    const isAdmin = user.role?.slug === 'admin';
    const isOwner = study.publishedById === user.id;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'Only the original publisher or an admin can modify this Estudo do Life.',
      );
    }
  }

  private async notifyLeadership(study: LifeGroupStudy): Promise<void> {
    const recipients = await this.accessService.resolveNotificationRecipients();

    // Co-leaders have no dedicated role slug, so they can't be expressed via
    // `filters.roles` alone. Persist their user ids explicitly in the
    // segment so that any future re-dispatch (e.g. NotificationsService's
    // `runDispatch`) resolves the same true recipient set instead of
    // silently dropping co-leaders.
    const roleSlugs = new Set<string>(LIFE_GROUP_STUDY_LEADERSHIP_ROLES);
    const coLeaderIds = recipients
      .filter((u) => !u.role?.slug || !roleSlugs.has(u.role.slug))
      .map((u) => u.id);

    const notification = this.entityManager.create(Notification, {
      title: `Novo Estudo do Life: ${study.title}`,
      message: study.title,
      deepLink: `paz://estudo-do-life/${study.id}`,
      category: 'life_group_study' as NotificationCategory,
      channels: ['push'],
      segment: {
        type: 'filtered',
        filters: {
          roles: [...LIFE_GROUP_STUDY_LEADERSHIP_ROLES],
          ...(coLeaderIds.length > 0 ? { user_ids: coLeaderIds } : {}),
        },
      },
      status: 'pending',
      origin: 'automatic',
    });
    const saved = await this.entityManager.save(notification);
    await this.dispatchService.dispatch(saved, recipients);
  }
}
