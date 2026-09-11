import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AreasService } from './areas.service';
import { Area } from './entities/area.entity';
import { Sector } from './../sectors/entities/sector.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';

describe('AreasService', () => {
  let service: AreasService;

  const em = {
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((_entity: unknown, data: unknown) =>
      Promise.resolve({ id: 1, ...(data as object) }),
    ),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    em.create.mockClear();
    em.save.mockClear();
    em.find.mockReset().mockResolvedValue([]);
    em.findOne.mockReset();
    em.count.mockReset().mockResolvedValue(0);
    em.remove.mockClear();

    const m = await Test.createTestingModule({
      providers: [
        AreasService,
        { provide: getEntityManagerToken(), useValue: em },
      ],
    }).compile();

    service = m.get(AreasService);
  });

  it('creates an area with leader and co-leader', async () => {
    em.findOne.mockResolvedValue({
      id: 1,
      name: 'Norte',
      leader: { id: 10, name: 'Leader' },
      coLeader: { id: 20, name: 'Co-Leader' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      name: 'Norte',
      leader_id: 10,
      co_leader_id: 20,
    });

    expect(result.leader_id).toBe(10);
    expect(result.co_leader_id).toBe(20);
  });

  it('rejects the same leader and co-leader', async () => {
    await expect(
      service.create({ name: 'Norte', leader_id: 10, co_leader_id: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks deletion when the area still has sectors', async () => {
    em.findOne.mockResolvedValue({ id: 1, name: 'Norte' });
    em.count.mockResolvedValue(2);

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(em.remove).not.toHaveBeenCalled();
  });

  it('allows deletion when the area has no sectors', async () => {
    em.findOne.mockResolvedValue({ id: 1, name: 'Norte' });
    em.count.mockResolvedValue(0);

    await service.remove(1);
    expect(em.remove).toHaveBeenCalledWith(Area, { id: 1, name: 'Norte' });
  });

  it('returns a nested hierarchy of areas, sectors and life groups', async () => {
    em.find.mockImplementation((entity: unknown) => {
      if (entity === Area) {
        return Promise.resolve([
          { id: 1, name: 'Norte', leader: null, coLeader: null },
        ]);
      }
      if (entity === Sector) {
        return Promise.resolve([
          {
            id: 2,
            name: 'Setor A',
            area: { id: 1 },
            leader: null,
            coLeader: null,
          },
        ]);
      }
      if (entity === LifeGroup) {
        return Promise.resolve([
          {
            id: 3,
            name: 'GC A',
            sector: { id: 2 },
            leader: null,
            coLeader: null,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const hierarchy = await service.getHierarchy();

    expect(hierarchy).toHaveLength(1);
    expect(hierarchy[0].sectors).toHaveLength(1);
    expect(hierarchy[0].sectors[0].life_groups).toHaveLength(1);
    expect(hierarchy[0].sectors[0].life_groups[0].id).toBe(3);
  });
});
