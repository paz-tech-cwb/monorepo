import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Area } from './entities/area.entity';
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
      created_at: area.createdAt,
      updated_at: area.updatedAt,
    };
  }

  async create(dto: CreateAreaDto) {
    try {
      const area = this.entityManager.create(Area, {
        name: dto.name,
      });
      const saved = await this.entityManager.save(area);
      return this.toResponse(saved);
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while creating the area.',
      );
    }
  }

  async findAll() {
    try {
      const areas = await this.entityManager.find(Area, {
        order: { name: 'ASC' },
      });
      return areas.map((a) => this.toResponse(a));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving areas.',
      );
    }
  }

  async findOne(id: number) {
    const area = await this.entityManager.findOne(Area, { where: { id } });
    if (!area) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return this.toResponse(area);
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

      if (dto.name !== undefined) area.name = dto.name;

      const saved = await this.entityManager.save(Area, area);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the area.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const area = await this.findOneEntity(id);
    await this.entityManager.remove(Area, area);
  }
}
