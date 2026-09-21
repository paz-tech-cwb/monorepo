import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Area } from './entities/area.entity';
import { Sector } from '../sectors/entities/sector.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { User } from '../users/entities/user.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(area: Area) {
    return {
      id: area.id,
      name: area.name,
      leader_id: area.leader?.id ?? null,
      leader_name: area.leader?.name ?? null,
      co_leader_id: area.coLeader?.id ?? null,
      co_leader_name: area.coLeader?.name ?? null,
      pastor_id: area.pastor?.id ?? null,
      pastor_name: area.pastor?.name ?? null,
      co_pastor_id: area.coPastor?.id ?? null,
      co_pastor_name: area.coPastor?.name ?? null,
      created_at: area.createdAt,
      updated_at: area.updatedAt,
    };
  }

  private assertDistinctLeaders(
    leaderId?: number | null,
    coLeaderId?: number | null,
    label = 'Leader',
  ): void {
    if (
      leaderId !== undefined &&
      leaderId !== null &&
      coLeaderId !== undefined &&
      coLeaderId !== null &&
      leaderId === coLeaderId
    ) {
      throw new BadRequestException(
        `${label} and co-${label.toLowerCase()} must be different users.`,
      );
    }
  }

  private async assertPastorRole(userId: number): Promise<void> {
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      relations: ['role'],
    });
    if (!user || !['pastor', 'admin'].includes(user.role?.slug)) {
      throw new BadRequestException(
        'User must have the pastor role to be assigned as pastor.',
      );
    }
  }

  private async assertPastorRoles(
    pastorId?: number | null,
    coPastorId?: number | null,
  ): Promise<void> {
    if (pastorId !== undefined && pastorId !== null) {
      await this.assertPastorRole(pastorId);
    }
    if (coPastorId !== undefined && coPastorId !== null) {
      await this.assertPastorRole(coPastorId);
    }
  }

  async create(dto: CreateAreaDto) {
    this.assertDistinctLeaders(dto.leader_id, dto.co_leader_id);
    this.assertDistinctLeaders(dto.pastor_id, dto.co_pastor_id, 'Pastor');
    await this.assertPastorRoles(dto.pastor_id, dto.co_pastor_id);
    try {
      const area = this.entityManager.create(Area, {
        name: dto.name,
        leader: dto.leader_id ? ({ id: dto.leader_id } as User) : null,
        coLeader: dto.co_leader_id ? ({ id: dto.co_leader_id } as User) : null,
        pastor: dto.pastor_id ? ({ id: dto.pastor_id } as User) : null,
        coPastor: dto.co_pastor_id ? ({ id: dto.co_pastor_id } as User) : null,
      });
      const saved = await this.entityManager.save(area);
      return this.toResponse(await this.findOneWithRelations(saved.id));
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while creating the area.',
      );
    }
  }

  async findAll() {
    try {
      const areas = await this.entityManager.find(Area, {
        relations: ['leader', 'coLeader', 'pastor', 'coPastor'],
        order: { name: 'ASC' },
      });
      return areas.map((a) => this.toResponse(a));
    } catch {
      throw new BadRequestException(
        'An error occurred while retrieving areas.',
      );
    }
  }

  private async findOneWithRelations(id: number): Promise<Area> {
    const area = await this.entityManager.findOne(Area, {
      where: { id },
      relations: ['leader', 'coLeader', 'pastor', 'coPastor'],
    });
    if (!area) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return area;
  }

  async findOne(id: number) {
    return this.toResponse(await this.findOneWithRelations(id));
  }

  async findOneEntity(id: number): Promise<Area> {
    const area = await this.entityManager.findOne(Area, { where: { id } });
    if (!area) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return area;
  }

  async update(id: number, dto: UpdateAreaDto) {
    try {
      const area = await this.findOneEntity(id);

      const leaderId =
        dto.leader_id !== undefined ? dto.leader_id : area.leader?.id;
      const coLeaderId =
        dto.co_leader_id !== undefined ? dto.co_leader_id : area.coLeader?.id;
      this.assertDistinctLeaders(leaderId, coLeaderId);

      const pastorId =
        dto.pastor_id !== undefined ? dto.pastor_id : area.pastor?.id;
      const coPastorId =
        dto.co_pastor_id !== undefined ? dto.co_pastor_id : area.coPastor?.id;
      this.assertDistinctLeaders(pastorId, coPastorId, 'Pastor');
      await this.assertPastorRoles(dto.pastor_id, dto.co_pastor_id);

      if (dto.name !== undefined) area.name = dto.name;
      if (dto.leader_id !== undefined)
        area.leader = dto.leader_id ? ({ id: dto.leader_id } as User) : null;
      if (dto.co_leader_id !== undefined)
        area.coLeader = dto.co_leader_id
          ? ({ id: dto.co_leader_id } as User)
          : null;
      if (dto.pastor_id !== undefined)
        area.pastor = dto.pastor_id ? ({ id: dto.pastor_id } as User) : null;
      if (dto.co_pastor_id !== undefined)
        area.coPastor = dto.co_pastor_id
          ? ({ id: dto.co_pastor_id } as User)
          : null;

      await this.entityManager.save(Area, area);
      return this.toResponse(await this.findOneWithRelations(id));
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the area.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const area = await this.findOneEntity(id);

    const childSectorsCount = await this.entityManager.count(Sector, {
      where: { area: { id: area.id } },
    });
    if (childSectorsCount > 0) {
      throw new ConflictException(
        'Cannot delete this area because it still has sectors linked to it. Move or delete the sectors first.',
      );
    }

    await this.entityManager.remove(Area, area);
  }

  async getHierarchy() {
    const areas = await this.entityManager.find(Area, {
      relations: ['leader', 'coLeader'],
      order: { name: 'ASC' },
    });

    const sectors = await this.entityManager.find(Sector, {
      relations: ['area', 'leader', 'coLeader'],
      order: { name: 'ASC' },
    });

    const lifeGroups = await this.entityManager.find(LifeGroup, {
      relations: ['sector', 'leader', 'coLeader'],
      order: { name: 'ASC' },
    });

    return areas.map((area) => ({
      id: area.id,
      name: area.name,
      leader_id: area.leader?.id ?? null,
      leader_name: area.leader?.name ?? null,
      co_leader_id: area.coLeader?.id ?? null,
      co_leader_name: area.coLeader?.name ?? null,
      sectors: sectors
        .filter((sector) => sector.area?.id === area.id)
        .map((sector) => ({
          id: sector.id,
          name: sector.name,
          area_id: area.id,
          leader_id: sector.leader?.id ?? null,
          leader_name: sector.leader?.name ?? null,
          co_leader_id: sector.coLeader?.id ?? null,
          co_leader_name: sector.coLeader?.name ?? null,
          life_groups: lifeGroups
            .filter((lg) => lg.sector?.id === sector.id)
            .map((lg) => ({
              id: lg.id,
              name: lg.name,
              sector_id: sector.id,
              leader_id: lg.leader?.id ?? null,
              leader_name: lg.leader?.name ?? null,
              co_leader_id: lg.coLeader?.id ?? null,
              co_leader_name: lg.coLeader?.name ?? null,
            })),
        })),
    }));
  }

  async getOrgChart() {
    const areas = await this.entityManager.find(Area, {
      relations: ['leader', 'coLeader', 'pastor', 'coPastor'],
      order: { name: 'ASC' },
    });

    const sectors = await this.entityManager.find(Sector, {
      relations: ['area', 'leader', 'coLeader'],
      order: { name: 'ASC' },
    });

    const lifeGroups = await this.entityManager.find(LifeGroup, {
      relations: ['sector', 'leader', 'coLeader'],
      order: { name: 'ASC' },
    });

    const buildLifeGroupNode = (lifeGroup: LifeGroup) => ({
      id: lifeGroup.id,
      name: lifeGroup.name,
      sector_id: lifeGroup.sector?.id ?? null,
      leader_id: lifeGroup.leader?.id ?? null,
      leader_name: lifeGroup.leader?.name ?? null,
      co_leader_id: lifeGroup.coLeader?.id ?? null,
      co_leader_name: lifeGroup.coLeader?.name ?? null,
    });

    const buildSectorNode = (sector: Sector) => ({
      id: sector.id,
      name: sector.name,
      area_id: sector.area?.id ?? null,
      leader_id: sector.leader?.id ?? null,
      leader_name: sector.leader?.name ?? null,
      co_leader_id: sector.coLeader?.id ?? null,
      co_leader_name: sector.coLeader?.name ?? null,
      life_groups: lifeGroups
        .filter((lg) => lg.sector?.id === sector.id)
        .map((lg) => buildLifeGroupNode(lg)),
    });

    const buildAreaNode = (area: Area) => ({
      id: area.id,
      name: area.name,
      leader_id: area.leader?.id ?? null,
      leader_name: area.leader?.name ?? null,
      co_leader_id: area.coLeader?.id ?? null,
      co_leader_name: area.coLeader?.name ?? null,
      sectors: sectors
        .filter((sector) => sector.area?.id === area.id)
        .map((sector) => buildSectorNode(sector)),
    });

    const assignedAreas = areas.filter((area) => area.pastor?.id != null);
    const unassignedAreas = areas.filter((area) => area.pastor?.id == null);

    const groups = new Map<
      string,
      {
        pastor_id: number;
        pastor_name: string | null;
        co_pastor_id: number | null;
        co_pastor_name: string | null;
        areas: Area[];
      }
    >();

    for (const area of assignedAreas) {
      const pastorId = area.pastor!.id;
      const coPastorId = area.coPastor?.id ?? null;
      const key = `${pastorId}-${coPastorId ?? 'none'}`;
      const existing = groups.get(key);
      if (existing) {
        existing.areas.push(area);
      } else {
        groups.set(key, {
          pastor_id: pastorId,
          pastor_name: area.pastor!.name,
          co_pastor_id: coPastorId,
          co_pastor_name: area.coPastor?.name ?? null,
          areas: [area],
        });
      }
    }

    const roots = Array.from(groups.values()).map((group) => ({
      id: `pastor-${group.pastor_id}-${group.co_pastor_id ?? 'none'}`,
      pastor_id: group.pastor_id,
      pastor_name: group.pastor_name,
      co_pastor_id: group.co_pastor_id,
      co_pastor_name: group.co_pastor_name,
      areas: group.areas.map((area) => buildAreaNode(area)),
    }));

    const unassignedSectors = sectors.filter(
      (sector) => sector.area?.id == null,
    );
    const unassignedLifeGroups = lifeGroups.filter(
      (lg) => lg.sector?.id == null,
    );

    return {
      roots,
      unassigned_areas: unassignedAreas.map((area) => buildAreaNode(area)),
      unassigned_sectors: unassignedSectors.map((sector) =>
        buildSectorNode(sector),
      ),
      unassigned_life_groups: unassignedLifeGroups.map((lg) =>
        buildLifeGroupNode(lg),
      ),
    };
  }
}
