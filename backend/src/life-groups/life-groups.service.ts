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
import { Sector } from '../sectors/entities/sector.entity';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';

/**
 * How the viewer relates to a life group in `GET /life-groups/me`. Precedence
 * when several apply: leader > co_leader > supervisor > member.
 */
export type LifeGroupRelationship =
  | 'leader'
  | 'co_leader'
  | 'supervisor'
  | 'member';

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
  private async geocodeLocation(location: string): Promise<{
    latitude: number;
    longitude: number;
    city: string | null;
    neighborhood: string | null;
    state: string | null;
  } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(location)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PazChurchApp/1.0 (contato@igrejapaz.com.br)',
        },
      });
      if (!response.ok) return null;
      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          municipality?: string;
          suburb?: string;
          neighbourhood?: string;
          city_district?: string;
          state?: string;
        };
      }>;
      const first = results[0];
      if (!first) return null;
      const latitude = parseFloat(first.lat);
      const longitude = parseFloat(first.lon);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
      const address = first.address ?? {};
      return {
        latitude,
        longitude,
        city:
          address.city ??
          address.town ??
          address.village ??
          address.municipality ??
          null,
        neighborhood:
          address.suburb ??
          address.neighbourhood ??
          address.city_district ??
          null,
        state: address.state ?? null,
      };
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
  private canSeeMembers(
    lifeGroup: LifeGroup,
    viewer?: User,
    supervised = false,
  ): boolean {
    if (!viewer) return false;
    if (supervised) return true;
    if (
      (LEADERSHIP_ROLES as readonly string[]).includes(viewer.role?.slug ?? '')
    )
      return true;
    if (lifeGroup.leader?.id === viewer.id) return true;
    if (lifeGroup.coLeader?.id === viewer.id) return true;
    return lifeGroup.users?.some((u) => u.id === viewer.id) ?? false;
  }

  /**
   * Ids of the life groups the user supervises: every group in a sector the
   * user leads/co-leads, or in any sector of an area the user leads/co-leads.
   * One query; based on the leader rows, not on the role slug. Pass
   * `onlyGroupId` to test a single group (findOne) instead of listing all.
   */
  private async findSupervisedGroupIds(
    userId: number,
    onlyGroupId?: number,
  ): Promise<Set<number>> {
    const qb = this.entityManager
      .createQueryBuilder(LifeGroup, 'lg')
      .select('lg.id', 'id')
      .innerJoin('lg.sector', 'sector')
      .leftJoin('sector.area', 'area')
      .where(
        '(sector.leader_id = :userId OR sector.co_leader_id = :userId OR area.leader_id = :userId OR area.co_leader_id = :userId)',
        { userId },
      );
    if (onlyGroupId !== undefined) {
      qb.andWhere('lg.id = :onlyGroupId', { onlyGroupId });
    }
    const rows = await qb.getRawMany<{ id: number | string }>();
    return new Set(rows.map((r) => Number(r.id)));
  }

  private toResponse(
    lifeGroup: LifeGroup,
    viewer?: User,
    extras?: {
      supervised?: boolean;
      relationship?: LifeGroupRelationship;
      omitMembers?: boolean;
    },
  ) {
    const includeMembers =
      !extras?.omitMembers &&
      this.canSeeMembers(lifeGroup, viewer, extras?.supervised);
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
      image_url: lifeGroup.imageUrl ?? null,
      latitude: lifeGroup.latitude ?? null,
      longitude: lifeGroup.longitude ?? null,
      city: lifeGroup.city ?? null,
      neighborhood: lifeGroup.neighborhood ?? null,
      state: lifeGroup.state ?? null,
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
      // Only `GET /life-groups/me` supplies these (viewer-relative).
      ...(extras?.relationship
        ? {
            relationship: extras.relationship,
            is_supervised: extras.supervised === true,
          }
        : {}),
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
        coLeader: dto.co_leader_id ? ({ id: dto.co_leader_id } as User) : null,
        sector: dto.sector_id ? { id: dto.sector_id } : null,
        location: dto.location ?? null,
        imageUrl: dto.image_url ?? null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        city: coords?.city ?? null,
        neighborhood: coords?.neighborhood ?? null,
        state: coords?.state ?? null,
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
    } catch {
      throw new BadRequestException(
        'An error occurred while creating the life group.',
      );
    }
  }

  /**
   * Life groups related to the viewer, used by the mobile app's Grupos de
   * Vida tab and home card:
   * - `leader` / `co_leader`: the viewer leads or co-leads the group;
   * - `supervisor`: the group sits in a sector the viewer leads/co-leads, or
   *   in any sector of an area the viewer leads/co-leads (so area and sector
   *   leaders see every group under them, not only groups they roster in);
   * - `member`: the viewer is on the group's roster.
   * When several apply the precedence is leader > co_leader > supervisor >
   * member. `is_supervised` is true whenever the viewer supervises the group
   * via area/sector, even if a stronger relationship wins. Plain members are
   * never widened: only leader rows can add groups. Single query (no N+1);
   * the roster subquery keeps `users` unfiltered for `member_count`.
   */
  async findMine(viewer: User) {
    try {
      const lifeGroups = await this.entityManager
        .createQueryBuilder(LifeGroup, 'lg')
        .leftJoinAndSelect('lg.leader', 'leader')
        .leftJoinAndSelect('lg.coLeader', 'coLeader')
        .leftJoinAndSelect('lg.sector', 'sector')
        .leftJoinAndSelect('lg.users', 'users')
        .leftJoin('sector.leader', 'sectorLeader')
        .leftJoin('sector.coLeader', 'sectorCoLeader')
        .leftJoin('sector.area', 'area')
        .leftJoin('area.leader', 'areaLeader')
        .leftJoin('area.coLeader', 'areaCoLeader')
        .addSelect([
          'sectorLeader.id',
          'sectorCoLeader.id',
          'area.id',
          'areaLeader.id',
          'areaCoLeader.id',
        ])
        .where('leader.id = :viewerId', { viewerId: viewer.id })
        .orWhere('coLeader.id = :viewerId', { viewerId: viewer.id })
        .orWhere('sectorLeader.id = :viewerId', { viewerId: viewer.id })
        .orWhere('sectorCoLeader.id = :viewerId', { viewerId: viewer.id })
        .orWhere('areaLeader.id = :viewerId', { viewerId: viewer.id })
        .orWhere('areaCoLeader.id = :viewerId', { viewerId: viewer.id })
        .orWhere(
          'lg.id IN (SELECT ulg.life_group_id FROM user_life_groups ulg WHERE ulg.user_id = :viewerId)',
          { viewerId: viewer.id },
        )
        .orderBy('lg.name', 'ASC')
        .getMany();
      return lifeGroups.map((lg) => {
        const sector = lg.sector as
          | (Sector & { area?: { leader?: User; coLeader?: User } | null })
          | null;
        const supervised =
          sector?.leader?.id === viewer.id ||
          sector?.coLeader?.id === viewer.id ||
          sector?.area?.leader?.id === viewer.id ||
          sector?.area?.coLeader?.id === viewer.id;
        let relationship: LifeGroupRelationship = 'member';
        if (lg.leader?.id === viewer.id) relationship = 'leader';
        else if (lg.coLeader?.id === viewer.id) relationship = 'co_leader';
        else if (supervised) relationship = 'supervisor';
        // Supervisor-only rows (viewer is not leader/co-leader and is not
        // rostered) skip the roster: the home card only needs member_count,
        // and a supervisor of an area would otherwise receive hundreds of
        // rosters with emails. `GET /life-groups/:id` still returns it.
        const omitMembers =
          relationship === 'supervisor' &&
          !(lg.users ?? []).some((u) => u.id === viewer.id);
        return this.toResponse(lg, viewer, {
          supervised,
          relationship,
          omitMembers,
        });
      });
    } catch {
      throw new BadRequestException(
        'An error occurred while retrieving your life groups.',
      );
    }
  }

  /**
   * `search` here filters the full life-group listing (name, leader, or
   * co-leader name) for the mobile discovery screen — a different concern
   * from the `search()` method below, which backs the life-group picker
   * autocomplete in forms and has its own minimal {id, name} response shape.
   */
  async findAll(viewer?: User, search?: string) {
    try {
      if (search?.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        const lifeGroups = await this.entityManager
          .createQueryBuilder(LifeGroup, 'lg')
          .leftJoinAndSelect('lg.leader', 'leader')
          .leftJoinAndSelect('lg.coLeader', 'coLeader')
          .leftJoinAndSelect('lg.sector', 'sector')
          .leftJoinAndSelect('lg.users', 'users')
          .where(
            '(LOWER(lg.name) LIKE :term OR LOWER(leader.name) LIKE :term OR LOWER(coLeader.name) LIKE :term)',
            { term },
          )
          .orderBy('lg.name', 'ASC')
          .take(30)
          .getMany();
        return lifeGroups.map((lg) => this.toResponse(lg, viewer));
      }

      const lifeGroups = await this.entityManager.find(LifeGroup, {
        relations: ['leader', 'coLeader', 'sector', 'users'],
        order: { name: 'ASC' },
      });
      return lifeGroups.map((lg) => this.toResponse(lg, viewer));
    } catch {
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
    const supervised = viewer
      ? (await this.findSupervisedGroupIds(viewer.id, lifeGroup.id)).has(
          lifeGroup.id,
        )
      : false;
    return this.toResponse(lifeGroup, viewer, { supervised });
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
          ? ({ id: dto.leader_id } as User)
          : null;
      if (dto.co_leader_id !== undefined)
        lifeGroup.coLeader = dto.co_leader_id
          ? ({ id: dto.co_leader_id } as User)
          : null;
      if (dto.sector_id !== undefined)
        lifeGroup.sector = dto.sector_id
          ? ({ id: dto.sector_id } as Sector)
          : null;
      if (dto.location !== undefined) {
        lifeGroup.location = dto.location;
        const coords = dto.location
          ? await this.geocodeLocation(dto.location)
          : null;
        lifeGroup.latitude = coords?.latitude ?? null;
        lifeGroup.longitude = coords?.longitude ?? null;
        lifeGroup.city = coords?.city ?? null;
        lifeGroup.neighborhood = coords?.neighborhood ?? null;
        lifeGroup.state = coords?.state ?? null;
      }
      if (dto.image_url !== undefined) lifeGroup.imageUrl = dto.image_url;
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
