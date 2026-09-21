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

  it('creates an area with pastor and co-pastor', async () => {
    em.findOne.mockResolvedValueOnce({ id: 30, role: { slug: 'pastor' } });
    em.findOne.mockResolvedValueOnce({ id: 40, role: { slug: 'pastor' } });
    em.findOne.mockResolvedValue({
      id: 1,
      name: 'Norte',
      leader: null,
      coLeader: null,
      pastor: { id: 30, name: 'Jackson Mendes' },
      coPastor: { id: 40, name: 'Meila Conceição' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      name: 'Norte',
      pastor_id: 30,
      co_pastor_id: 40,
    });

    expect(em.create).toHaveBeenCalledWith(
      Area,
      expect.objectContaining({
        pastor: { id: 30 },
        coPastor: { id: 40 },
      }),
    );
    expect(result.pastor_id).toBe(30);
    expect(result.co_pastor_id).toBe(40);
  });

  it('rejects the same pastor and co-pastor', async () => {
    await expect(
      service.create({ name: 'Norte', pastor_id: 30, co_pastor_id: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears pastor and co-pastor on update when explicitly set to null', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Norte',
      leader: null,
      coLeader: null,
      pastor: { id: 30, name: 'Jackson Mendes' },
      coPastor: { id: 40, name: 'Meila Conceição' },
    });
    em.findOne.mockResolvedValueOnce({
      id: 1,
      name: 'Norte',
      leader: null,
      coLeader: null,
      pastor: null,
      coPastor: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update(1, {
      pastor_id: null as unknown as number,
      co_pastor_id: null as unknown as number,
    });

    expect(em.save).toHaveBeenCalledWith(
      Area,
      expect.objectContaining({ pastor: null, coPastor: null }),
    );
    expect(result.pastor_id).toBeNull();
    expect(result.co_pastor_id).toBeNull();
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

  it('groups areas under a single pastor/co-pastor root for the org chart', async () => {
    em.find.mockImplementation((entity: unknown) => {
      if (entity === Area) {
        return Promise.resolve([
          {
            id: 1,
            name: 'Norte',
            leader: null,
            coLeader: null,
            pastor: { id: 30, name: 'Jackson Mendes' },
            coPastor: { id: 40, name: 'Meila Conceição' },
          },
          {
            id: 2,
            name: 'Sul',
            leader: null,
            coLeader: null,
            pastor: { id: 30, name: 'Jackson Mendes' },
            coPastor: { id: 40, name: 'Meila Conceição' },
          },
          {
            id: 3,
            name: 'Sem Pastor',
            leader: null,
            coLeader: null,
            pastor: null,
            coPastor: null,
          },
        ]);
      }
      if (entity === Sector) {
        return Promise.resolve([
          {
            id: 4,
            name: 'Setor Sem Área',
            area: null,
            leader: null,
            coLeader: null,
          },
        ]);
      }
      if (entity === LifeGroup) {
        return Promise.resolve([
          {
            id: 5,
            name: 'GC Sem Setor',
            sector: null,
            leader: null,
            coLeader: null,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const orgChart = await service.getOrgChart();

    expect(orgChart.roots).toHaveLength(1);
    expect(orgChart.roots[0].pastor_id).toBe(30);
    expect(orgChart.roots[0].co_pastor_id).toBe(40);
    expect(orgChart.roots[0].areas).toHaveLength(2);
    expect(orgChart.unassigned_areas).toHaveLength(1);
    expect(orgChart.unassigned_areas[0].id).toBe(3);
    expect(orgChart.unassigned_sectors).toHaveLength(1);
    expect(orgChart.unassigned_sectors[0].id).toBe(4);
    expect(orgChart.unassigned_life_groups).toHaveLength(1);
    expect(orgChart.unassigned_life_groups[0].id).toBe(5);
  });
});
