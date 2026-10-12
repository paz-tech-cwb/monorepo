import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroupTaskTemplatesService } from './life-group-task-templates.service';
import { LifeGroupTaskAssignment } from './entities/life-group-task-assignment.entity';
import { LifeGroupTaskTemplate } from './entities/life-group-task-template.entity';

function tpl(id: number, sortOrder: number) {
  return {
    id,
    name: `T${id}`,
    description: '',
    guidance: '',
    sortOrder,
    isActive: true,
  } as LifeGroupTaskTemplate;
}

function makeService(templates: LifeGroupTaskTemplate[], used = 0) {
  const em = {
    find: jest.fn(() => Promise.resolve(templates)),
    findOne: jest.fn((_entity: unknown, opts: { where: { id: number } }) =>
      Promise.resolve(templates.find((t) => t.id === opts.where.id) ?? null),
    ),
    count: jest.fn(() => Promise.resolve(used)),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
    remove: jest.fn((value: unknown) => Promise.resolve(value)),
  };
  return {
    service: new LifeGroupTaskTemplatesService(em as unknown as EntityManager),
    em,
  };
}

describe('LifeGroupTaskTemplatesService', () => {
  it('create appends after the last sort_order and defaults to active', async () => {
    const { service } = makeService([tpl(1, 4)]);
    const result = await service.create({ name: '  Louvor ' });
    expect(result).toMatchObject({
      name: 'Louvor',
      sort_order: 5,
      is_active: true,
      description: '',
      guidance: '',
    });
  });

  it('update changes only the provided fields and 404s for unknown ids', async () => {
    const { service } = makeService([tpl(1, 0)]);
    const result = await service.update(1, { guidance: '# md' });
    expect(result).toMatchObject({ name: 'T1', guidance: '# md' });
    await expect(service.update(9, { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove refuses templates that already have assignments', async () => {
    const { service, em } = makeService([tpl(1, 0)], 2);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(em.count).toHaveBeenCalledWith(LifeGroupTaskAssignment, {
      where: { templateId: 1 },
    });
    expect(em.remove).not.toHaveBeenCalled();
  });

  it('remove deletes an unused template', async () => {
    const { service, em } = makeService([tpl(1, 0)], 0);
    await service.remove(1);
    expect(em.remove).toHaveBeenCalled();
  });

  it('reorder applies the given order and keeps unlisted templates after', async () => {
    const templates = [tpl(1, 0), tpl(2, 1), tpl(3, 2)];
    const { service } = makeService(templates);
    const result = await service.reorder([3, 1]);
    expect(result.map((t) => [t.id, t.sort_order])).toEqual([
      [3, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it('reorder rejects unknown ids', async () => {
    const { service } = makeService([tpl(1, 0)]);
    await expect(service.reorder([1, 77])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
