import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LifeGroupTaskAssignment } from './entities/life-group-task-assignment.entity';
import { LifeGroupTaskTemplate } from './entities/life-group-task-template.entity';
import {
  CreateLifeGroupTaskTemplateDto,
  UpdateLifeGroupTaskTemplateDto,
} from './dto/life-group-task-template.dto';

export function toTemplateResponse(template: LifeGroupTaskTemplate) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    guidance: template.guidance,
    sort_order: template.sortOrder,
    is_active: template.isActive,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

@Injectable()
export class LifeGroupTaskTemplatesService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  private async findOrThrow(id: number): Promise<LifeGroupTaskTemplate> {
    const template = await this.em.findOne(LifeGroupTaskTemplate, {
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Task template ${id} not found`);
    }
    return template;
  }

  async list(): Promise<ReturnType<typeof toTemplateResponse>[]> {
    const templates = await this.em.find(LifeGroupTaskTemplate, {
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return templates.map(toTemplateResponse);
  }

  async create(
    dto: CreateLifeGroupTaskTemplateDto,
  ): Promise<ReturnType<typeof toTemplateResponse>> {
    const [last] = await this.em.find(LifeGroupTaskTemplate, {
      order: { sortOrder: 'DESC' },
      take: 1,
    });
    const template = this.em.create(LifeGroupTaskTemplate, {
      name: dto.name.trim(),
      description: dto.description ?? '',
      guidance: dto.guidance ?? '',
      isActive: dto.isActive ?? true,
      sortOrder: last ? last.sortOrder + 1 : 0,
    });
    return toTemplateResponse(await this.em.save(template));
  }

  async update(
    id: number,
    dto: UpdateLifeGroupTaskTemplateDto,
  ): Promise<ReturnType<typeof toTemplateResponse>> {
    const template = await this.findOrThrow(id);
    if (dto.name !== undefined) template.name = dto.name.trim();
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.guidance !== undefined) template.guidance = dto.guidance;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;
    return toTemplateResponse(await this.em.save(template));
  }

  /**
   * Templates already used by assignments cannot be deleted (history keeps
   * the FK); deactivate them instead.
   */
  async remove(id: number): Promise<void> {
    const template = await this.findOrThrow(id);
    const used = await this.em.count(LifeGroupTaskAssignment, {
      where: { templateId: id },
    });
    if (used > 0) {
      throw new ConflictException(
        'This task template already has assignments; deactivate it instead.',
      );
    }
    await this.em.remove(template);
  }

  /**
   * `templateIds` is the new order. Templates not listed keep their relative
   * order after the listed ones.
   */
  async reorder(
    templateIds: number[],
  ): Promise<ReturnType<typeof toTemplateResponse>[]> {
    const all = await this.em.find(LifeGroupTaskTemplate, {
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const byId = new Map(all.map((t) => [t.id, t]));
    const unknown = templateIds.filter((id) => !byId.has(id));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown task template ids: ${unknown.join(', ')}`,
      );
    }
    const listed = new Set(templateIds);
    const ordered = [
      ...templateIds.map((id) => byId.get(id) as LifeGroupTaskTemplate),
      ...all.filter((t) => !listed.has(t.id)),
    ];
    ordered.forEach((template, index) => {
      template.sortOrder = index;
    });
    const saved = await this.em.save(ordered);
    return saved.map(toTemplateResponse);
  }
}
