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
      created_at: area.createdAt,
      updated_at: area.updatedAt,
    };
  }

  private assertDistinctLeaders(
    leaderId?: number | null,
    coLeaderId?: number | null,
  ): void {
    if (
      leaderId !== undefined &&
      leaderId !== null &&
      coLeaderId !== undefined &&
      coLeaderId !== null &&
      leaderId === coLeaderId
    ) {
      throw new BadRequestException(
        'Leader and co-leader must be different users.',
      );
    }
  }

  async create(dto: CreateAreaDto) {
    this.assertDistinctLeaders(dto.leader_id, dto.co_leader_id);
    try {
      const area = this.entityManager.create(Area, {
        name: dto.name,
        leader: dto.leader_id ? ({ id: dto.leader_id } as User) : null,
        coLeader: dto.co_leader_id ? ({ id: dto.co_leader_id } as User) : null,
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
        relations: ['leader', 'coLeader'],
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
      relations: ['leader', 'coLeader'],
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

      if (dto.name !== undefined) area.name = dto.name;
      if (dto.leader_id !== undefined)
        area.leader = dto.leader_id ? ({ id: dto.leader_id } as User) : null;
      if (dto.co_leader_id !== undefined)
        area.coLeader = dto.co_leader_id
          ? ({ id: dto.co_leader_id } as User)
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
}
