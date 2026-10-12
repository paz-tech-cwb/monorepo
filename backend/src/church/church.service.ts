import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Church } from './entities/church.entity';
import { UserChurch } from './entities/user-church.entity';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';

@Injectable()
export class ChurchService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(church: Church) {
    return {
      id: church.id,
      name: church.name,
      slug: church.slug ?? null,
      is_active: church.isActive,
      description: church.description ?? null,
      address: church.address,
      contact: church.contact,
      schedule: church.schedule,
      social_media: church.socialMedia,
      updated_at: church.updatedAt,
    };
  }

  /**
   * Resolves a user's primary ("home") filial id, falling back to their
   * first associated filial if none is explicitly marked primary, and to
   * `null` if the user has no filial association at all (e.g. legacy data).
   * Used by the JWT/`/users/me` payload and by the bare GET/PUT `/church`
   * backward-compat routes.
   */
  async resolvePrimaryChurchId(userId: number): Promise<number | null> {
    const rows = await this.entityManager.find(UserChurch, {
      where: { user: { id: userId } },
      relations: ['church'],
      order: { isPrimary: 'DESC', id: 'ASC' },
    });
    return rows[0]?.church?.id ?? null;
  }

  /**
   * Resolves the church record used by the legacy bare `GET /church` /
   * `PUT /church` routes: the requesting user's primary filial when known,
   * otherwise the first church row by id (keeps the routes working during
   * the transition for callers that don't yet send a user context, and for
   * users without a filial association).
   */
  private async resolveContextChurch(userId?: number): Promise<Church> {
    if (userId) {
      const primaryId = await this.resolvePrimaryChurchId(userId);
      if (primaryId) {
        const church = await this.entityManager.findOne(Church, {
          where: { id: primaryId },
        });
        if (church) return church;
      }
    }

    const fallback = await this.entityManager.findOne(Church, {
      order: { id: 'ASC' },
    });
    if (!fallback) {
      throw new NotFoundException('Church record not found.');
    }
    return fallback;
  }

  async get(userId?: number) {
    return this.toResponse(await this.resolveContextChurch(userId));
  }

  async update(dto: UpdateChurchDto, userId?: number) {
    try {
      const church = await this.resolveContextChurch(userId);
      this.applyUpdate(church, dto);
      const saved = await this.entityManager.save(Church, church);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating church data.',
      );
    }
  }

  async list() {
    const churches = await this.entityManager.find(Church, {
      order: { name: 'ASC' },
    });
    return churches.map((c) => this.toResponse(c));
  }

  async findById(id: number) {
    const church = await this.entityManager.findOne(Church, { where: { id } });
    if (!church) {
      throw new NotFoundException(`Church with ID ${id} not found`);
    }
    return this.toResponse(church);
  }

  async create(dto: CreateChurchDto) {
    try {
      const church = this.entityManager.create(Church, {
        name: dto.name,
        slug: dto.slug ?? null,
        isActive: dto.isActive ?? true,
        description: dto.description ?? null,
        address: (dto.address as unknown as Church['address']) ?? {},
        contact: (dto.contact as unknown as Church['contact']) ?? {},
        schedule: (dto.schedule as unknown as Church['schedule']) ?? {},
        socialMedia:
          (dto.social_media as unknown as Church['socialMedia']) ?? {},
      });
      const saved = await this.entityManager.save(Church, church);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('A church with this slug already exists');
      }
      throw new BadRequestException(
        'An error occurred while creating the church.',
      );
    }
  }

  async updateById(id: number, dto: UpdateChurchDto) {
    try {
      const church = await this.entityManager.findOne(Church, {
        where: { id },
      });
      if (!church) {
        throw new NotFoundException(`Church with ID ${id} not found`);
      }
      this.applyUpdate(church, dto);
      const saved = await this.entityManager.save(Church, church);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('A church with this slug already exists');
      }
      throw new BadRequestException(
        'An error occurred while updating church data.',
      );
    }
  }

  private applyUpdate(church: Church, dto: UpdateChurchDto): void {
    if (dto.name !== undefined) church.name = dto.name;
    if (dto.slug !== undefined) church.slug = dto.slug;
    if (dto.isActive !== undefined) church.isActive = dto.isActive;
    if (dto.description !== undefined) church.description = dto.description;
    if (dto.address !== undefined)
      church.address = {
        ...church.address,
        ...(dto.address as unknown as Church['address']),
      };
    if (dto.contact !== undefined)
      church.contact = {
        ...church.contact,
        ...(dto.contact as unknown as Church['contact']),
      };
    if (dto.schedule !== undefined)
      church.schedule = {
        ...church.schedule,
        ...(dto.schedule as unknown as Church['schedule']),
      };
    if (dto.social_media !== undefined)
      church.socialMedia = {
        ...church.socialMedia,
        ...(dto.social_media as unknown as Church['socialMedia']),
      };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
