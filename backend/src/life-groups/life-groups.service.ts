import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LifeGroup } from './entities/life-group.entity';
import { CreateLifeGroupDto } from './dto/create-life-group.dto';
import { UpdateLifeGroupDto } from './dto/update-life-group.dto';
import { User } from '../users/entities/user.entity';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';

@Injectable()
export class LifeGroupsService {
  private readonly logger = new Logger(LifeGroupsService.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Geocodes a free-text address via OpenStreetMap's Nominatim (no API key,
   * suitable for this app's low volume — one call per life-group create/update,
   * not per-request). Returns null on any failure; geocoding is best-effort
   * and must never block saving the life group.
   */
  private async geocodeLocation(
    location: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'PazChurchApp/1.0 (contato@igrejapaz.com.br)' },
      });
      if (!response.ok) return null;
      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
      }>;
      const first = results[0];
      if (!first) return null;
      const latitude = parseFloat(first.lat);
      const longitude = parseFloat(first.lon);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
      return { latitude, longitude };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Geocoding failed for "${location}": ${message}`);
      return null;
    }
  }

  /**
   * The full member roster is only included when the caller belongs to this
   * life group themselves (or is a leader/admin) — otherwise a member
   * browsing OTHER groups could see everyone else's name, which is a
   * privacy leak this endpoint has no business exposing to non-members.
   */
  private canSeeMembers(lifeGroup: LifeGroup, viewer?: User): boolean {
    if (!viewer) return false;
    if (
      (LEADERSHIP_ROLES as readonly string[]).includes(
        viewer.role?.slug ?? '',
      )
    )
      return true;
    if (lifeGroup.leader?.id === viewer.id) return true;
    if (lifeGroup.coLeader?.id === viewer.id) return true;
    return lifeGroup.users?.some((u) => u.id === viewer.id) ?? false;
  }

  private toResponse(lifeGroup: LifeGroup, viewer?: User) {
    const includeMembers = this.canSeeMembers(lifeGroup, viewer);
    return {
      id: lifeGroup.id,
      name: lifeGroup.name,
      leader_id: lifeGroup.leader?.id ?? null,
      leader_name: lifeGroup.leader?.name ?? null,
      leader_phone: lifeGroup.leader?.phoneNumber ?? null,
      co_leader_id: lifeGroup.coLeader?.id ?? null,
      co_leader_name: lifeGroup.coLeader?.name ?? null,
      co_leader_phone: lifeGroup.coLeader?.phoneNumber ?? null,
      sector_id: lifeGroup.sector?.id ?? null,
      location: lifeGroup.location ?? null,
      latitude: lifeGroup.latitude ?? null,
      longitude: lifeGroup.longitude ?? null,
      meeting_day: lifeGroup.meetingDay ?? null,
      meeting_time: lifeGroup.meetingTime ?? null,
      member_count: lifeGroup.users?.length ?? 0,
      kids_count: lifeGroup.kidsCount ?? 0,
      // Not the viewer's group (and not a leader/admin): omit entirely
      // rather than send an empty array, so clients can't confuse
      // "no members" with "not allowed to see members".
      members: includeMembers
        ? (lifeGroup.users?.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email ?? '',
          })) ?? [])
        : null,
      created_at: lifeGroup.createdAt,
      updated_at: lifeGroup.updatedAt,
    };
  }

  async create(dto: CreateLifeGroupDto) {
    try {
      const coords = dto.location
        ? await this.geocodeLocation(dto.location)
        : null;
      const lifeGroup = this.entityManager.create(LifeGroup, {
        name: dto.name,
        leader: dto.leader_id ? { id: dto.leader_id } : null,
        coLeader: dto.co_leader_id ? ({ id: dto.co_leader_id } as any) : null,
        sector: dto.sector_id ? { id: dto.sector_id } : null,
        location: dto.location ?? null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        kidsCount: dto.kids_count ?? 0,
        meetingDay: dto.meeting_day ?? null,
        meetingTime: dto.meeting_time ?? null,
      });
      const saved = await this.entityManager.save(lifeGroup);
      const loaded = await this.entityManager.findOne(LifeGroup, {
        where: { id: saved.id },
        relations: ['leader', 'coLeader', 'sector', 'users'],
      });
      return this.toResponse(loaded!);
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while creating the life group.',
      );
    }
  }

  async findAll(viewer?: User) {
    try {
      const lifeGroups = await this.entityManager.find(LifeGroup, {
        relations: ['leader', 'coLeader', 'sector', 'users'],
        order: { name: 'ASC' },
      });
      return lifeGroups.map((lg) => this.toResponse(lg, viewer));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving life groups.',
      );
    }
  }

  async search(q: string): Promise<{ id: number; name: string }[]> {
    const term = `%${q.trim().toLowerCase()}%`;
    const groups = await this.entityManager
      .createQueryBuilder(LifeGroup, 'lg')
      .where('LOWER(lg.name) LIKE :term', { term })
      .orderBy('lg.name', 'ASC')
      .take(30)
      .getMany();
    return groups.map((lg) => ({ id: lg.id, name: lg.name }));
  }

  async findOne(id: number, viewer?: User) {
    const lifeGroup = await this.entityManager.findOne(LifeGroup, {
      where: { id },
      relations: ['leader', 'coLeader', 'sector', 'users'],
    });
    if (!lifeGroup) {
      throw new NotFoundException(`Life group with ID ${id} not found`);
    }
    return this.toResponse(lifeGroup, viewer);
  }

  async findOneEntity(id: number): Promise<LifeGroup> {
    const lifeGroup = await this.entityManager.findOne(LifeGroup, {
      where: { id },
      relations: ['leader', 'coLeader', 'sector', 'users'],
    });
    if (!lifeGroup) {
      throw new NotFoundException(`Life group with ID ${id} not found`);
    }
    return lifeGroup;
  }

  async update(id: number, dto: UpdateLifeGroupDto) {
    try {
      const lifeGroup = await this.findOneEntity(id);

      if (dto.name !== undefined) lifeGroup.name = dto.name;
      if (dto.leader_id !== undefined)
        lifeGroup.leader = dto.leader_id
          ? ({ id: dto.leader_id } as any)
          : null;
      if (dto.co_leader_id !== undefined)
        lifeGroup.coLeader = dto.co_leader_id
          ? ({ id: dto.co_leader_id } as any)
          : null;
      if (dto.sector_id !== undefined)
        lifeGroup.sector = dto.sector_id
          ? ({ id: dto.sector_id } as any)
          : null;
      if (dto.location !== undefined) {
        lifeGroup.location = dto.location;
        const coords = dto.location
          ? await this.geocodeLocation(dto.location)
          : null;
        lifeGroup.latitude = coords?.latitude ?? null;
        lifeGroup.longitude = coords?.longitude ?? null;
      }
      if (dto.kids_count !== undefined) lifeGroup.kidsCount = dto.kids_count;
      if (dto.meeting_day !== undefined) lifeGroup.meetingDay = dto.meeting_day;
      if (dto.meeting_time !== undefined)
        lifeGroup.meetingTime = dto.meeting_time;

      const saved = await this.entityManager.save(LifeGroup, lifeGroup);
      const loaded = await this.entityManager.findOne(LifeGroup, {
        where: { id: saved.id },
        relations: ['leader', 'coLeader', 'sector', 'users'],
      });
      return this.toResponse(loaded!);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the life group.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const lifeGroup = await this.findOneEntity(id);
    await this.entityManager.remove(LifeGroup, lifeGroup);
  }

  async addMember(lifeGroupId: number, userId: number): Promise<void> {
    const lifeGroup = await this.findOneEntity(lifeGroupId);
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      relations: ['lifeGroups'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const alreadyMember = user.lifeGroups.some((lg) => lg.id === lifeGroupId);
    // Idempotent: no-op if user is already a member
    if (!alreadyMember) {
      user.lifeGroups.push(lifeGroup);
      await this.entityManager.save(User, user);
    }
  }

  async removeMember(lifeGroupId: number, userId: number): Promise<void> {
    await this.findOneEntity(lifeGroupId); // throws NotFoundException if group not found
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      relations: ['lifeGroups'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // Idempotent: no-op if user is not a member
    const lengthBefore = user.lifeGroups.length;
    user.lifeGroups = user.lifeGroups.filter((lg) => lg.id !== lifeGroupId);
    if (user.lifeGroups.length < lengthBefore) {
      await this.entityManager.save(User, user);
    }
  }
}
