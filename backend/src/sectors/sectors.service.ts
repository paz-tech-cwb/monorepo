import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Sector } from './entities/sector.entity';
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
      created_at: sector.createdAt,
      updated_at: sector.updatedAt,
    };
  }

  async create(dto: CreateSectorDto) {
    try {
      const sector = this.entityManager.create(Sector, {
        name: dto.name,
      });
      const saved = await this.entityManager.save(sector);
      return this.toResponse(saved);
    } catch {
      throw new BadRequestException(
        'An error occurred while creating the sector.',
      );
    }
  }

  async findAll() {
    try {
      const sectors = await this.entityManager.find(Sector, {
        relations: ['area'],
        order: { name: 'ASC' },
      });
      return sectors.map((s) => this.toResponse(s));
    } catch {
      throw new BadRequestException(
        'An error occurred while retrieving sectors.',
      );
    }
  }

  async findOne(id: number) {
    const sector = await this.entityManager.findOne(Sector, {
      where: { id },
      relations: ['area'],
    });
    if (!sector) {
      throw new NotFoundException(`Sector with ID ${id} not found`);
    }
    return this.toResponse(sector);
  }

  async findOneEntity(id: number): Promise<Sector> {
    const sector = await this.entityManager.findOne(Sector, { where: { id } });
    if (!sector) {
      throw new NotFoundException(`Sector with ID ${id} not found`);
    }
    return sector;
  }

  async update(id: number, dto: UpdateSectorDto) {
    try {
      const sector = await this.findOneEntity(id);

      if (dto.name !== undefined) sector.name = dto.name;

      const saved = await this.entityManager.save(Sector, sector);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the sector.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const sector = await this.findOneEntity(id);
    await this.entityManager.remove(Sector, sector);
  }
}
