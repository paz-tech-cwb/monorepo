import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { SectorsService } from './sectors.service';
import { Sector } from './entities/sector.entity';

describe('SectorsService', () => {
  let service: SectorsService;

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
        SectorsService,
        { provide: getEntityManagerToken(), useValue: em },
      ],
    }).compile();

    service = m.get(SectorsService);
  });

  it('creates a sector with an area, leader and co-leader', async () => {
    em.findOne.mockResolvedValue({
      id: 1,
      name: 'Setor A',
      area: { id: 5, name: 'Norte' },
      leader: { id: 10, name: 'Leader' },
      coLeader: { id: 20, name: 'Co-Leader' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      name: 'Setor A',
      area_id: 5,
      leader_id: 10,
      co_leader_id: 20,
    });

    expect(result.area_id).toBe(5);
    expect(result.area_name).toBe('Norte');
    expect(result.leader_id).toBe(10);
    expect(result.co_leader_id).toBe(20);
  });

  it('rejects the same leader and co-leader', async () => {
    await expect(
      service.create({ name: 'Setor A', leader_id: 10, co_leader_id: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks deletion when the sector still has life groups', async () => {
    em.findOne.mockResolvedValue({ id: 1, name: 'Setor A', area: null });
    em.count.mockResolvedValue(3);

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(em.remove).not.toHaveBeenCalled();
  });

  it('allows deletion when the sector has no life groups', async () => {
    em.findOne.mockResolvedValue({ id: 1, name: 'Setor A', area: null });
    em.count.mockResolvedValue(0);

    await service.remove(1);
    expect(em.remove).toHaveBeenCalledWith(Sector, {
      id: 1,
      name: 'Setor A',
      area: null,
    });
  });
});
