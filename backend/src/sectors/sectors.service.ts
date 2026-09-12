import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Sector } from './entities/sector.entity';
import { Area } from '../areas/entities/area.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { User } from '../users/entities/user.entity';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';

@Injectable()
export class SectorsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(sector: Sector) {
    return {
      id: sector.id,
      name: sector.name,
      area_id: sector.area?.id ?? null,
      area_name: sector.area?.name ?? null,
      leader_id: sector.leader?.id ?? null,
      leader_name: sector.leader?.name ?? null,
      co_leader_id: sector.coLeader?.id ?? null,
      co_leader_name: sector.coLeader?.name ?? null,
      created_at: sector.createdAt,
      updated_at: sector.updatedAt,
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

  async create(dto: CreateSectorDto) {
    this.assertDistinctLeaders(dto.leader_id, dto.co_leader_id);
    try {
      const sector = this.entityManager.create(Sector, {
        name: dto.name,
        area: dto.area_id ? ({ id: dto.area_id } as Area) : null,
        leader: dto.leader_id ? ({ id: dto.leader_id } as User) : null,
        coLeader: dto.co_leader_id ? ({ id: dto.co_leader_id } as User) : null,
      });
      const saved = await this.entityManager.save(sector);
      return this.toResponse(await this.findOneWithRelations(saved.id));
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while creating the sector.',
      );
    }
  }

  async findAll() {
    try {
      const sectors = await this.entityManager.find(Sector, {
        relations: ['area', 'leader', 'coLeader'],
        order: { name: 'ASC' },
      });
      return sectors.map((s) => this.toResponse(s));
    } catch {
      throw new BadRequestException(
        'An error occurred while retrieving sectors.',
      );
    }
  }

  private async findOneWithRelations(id: number): Promise<Sector> {
    const sector = await this.entityManager.findOne(Sector, {
      where: { id },
      relations: ['area', 'leader', 'coLeader'],
    });
    if (!sector) {
      throw new NotFoundException(`Sector with ID ${id} not found`);
    }
    return sector;
  }

  async findOne(id: number) {
    return this.toResponse(await this.findOneWithRelations(id));
  }

  async findOneEntity(id: number): Promise<Sector> {
    const sector = await this.entityManager.findOne(Sector, {
      where: { id },
      relations: ['area'],
    });
    if (!sector) {
      throw new NotFoundException(`Sector with ID ${id} not found`);
    }
    return sector;
  }

  async update(id: number, dto: UpdateSectorDto) {
    try {
      const sector = await this.findOneWithRelations(id);

      const leaderId =
        dto.leader_id !== undefined ? dto.leader_id : sector.leader?.id;
      const coLeaderId =
        dto.co_leader_id !== undefined ? dto.co_leader_id : sector.coLeader?.id;
      this.assertDistinctLeaders(leaderId, coLeaderId);

      if (dto.name !== undefined) sector.name = dto.name;
      if (dto.area_id !== undefined)
        sector.area = dto.area_id ? ({ id: dto.area_id } as Area) : null;
      if (dto.leader_id !== undefined)
        sector.leader = dto.leader_id ? ({ id: dto.leader_id } as User) : null;
      if (dto.co_leader_id !== undefined)
        sector.coLeader = dto.co_leader_id
          ? ({ id: dto.co_leader_id } as User)
          : null;

      await this.entityManager.save(Sector, sector);
      return this.toResponse(await this.findOneWithRelations(id));
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the sector.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const sector = await this.findOneEntity(id);

    const childLifeGroupsCount = await this.entityManager.count(LifeGroup, {
      where: { sector: { id: sector.id } },
    });
    if (childLifeGroupsCount > 0) {
      throw new ConflictException(
        'Cannot delete this sector because it still has life groups linked to it. Move or delete the life groups first.',
      );
    }

    await this.entityManager.remove(Sector, sector);
  }
}
