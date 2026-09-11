import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { Area } from '../../areas/entities/area.entity';
import { Sector } from '../../sectors/entities/sector.entity';
import { ScopeResolverService } from './scope-resolver.service';

describe('ScopeResolverService', () => {
  let service: ScopeResolverService;

  const lifeQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([] as { id: number }[]),
  };

  const userRepo = { findOne: jest.fn() };
  const lifeRepo = {
    find: jest.fn().mockResolvedValue([] as { id: number }[]),
    findOne: jest.fn().mockResolvedValue(null as { id: number } | null),
    createQueryBuilder: jest.fn().mockReturnValue(lifeQueryBuilder),
  };
  const areaRepo = {
    findOne: jest.fn().mockResolvedValue(null as { id: number } | null),
  };
  const sectorRepo = {
    findOne: jest.fn().mockResolvedValue(null as { id: number } | null),
    find: jest.fn().mockResolvedValue([] as { id: number }[]),
  };

  beforeEach(async () => {
    userRepo.findOne.mockReset();
    lifeRepo.find.mockReset().mockResolvedValue([]);
    lifeRepo.findOne.mockReset().mockResolvedValue(null);
    lifeQueryBuilder.getMany.mockReset().mockResolvedValue([]);
    areaRepo.findOne.mockReset().mockResolvedValue(null);
    sectorRepo.findOne.mockReset().mockResolvedValue(null);
    sectorRepo.find.mockReset().mockResolvedValue([]);

    const m = await Test.createTestingModule({
      providers: [
        ScopeResolverService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(LifeGroup), useValue: lifeRepo },
        { provide: getRepositoryToken(Area), useValue: areaRepo },
        { provide: getRepositoryToken(Sector), useValue: sectorRepo },
      ],
    }).compile();
    service = m.get(ScopeResolverService);
  });

  it('returns unrestricted for admin', async () => {
    userRepo.findOne.mockResolvedValue({ id: 1, role: { slug: 'admin' } });
    const scope = await service.resolve(1);
    expect(scope.unrestricted).toBe(true);
  });

  it('returns life-only scope for life_group_leader', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 2,
      role: { slug: 'life_group_leader' },
    });
    lifeRepo.findOne.mockResolvedValue({ id: 5 });
    const scope = await service.resolve(2);
    expect(scope).toMatchObject({ unrestricted: false, lifeGroupIds: [5] });
  });

  it('returns the same life-only scope for a life group co-leader', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 3,
      role: { slug: 'life_group_leader' },
    });
    lifeRepo.findOne.mockResolvedValue({ id: 7 });
    const scope = await service.resolve(3);
    expect(scope).toMatchObject({ unrestricted: false, lifeGroupIds: [7] });
    expect(lifeRepo.findOne).toHaveBeenCalledWith({
      where: [{ leader: { id: 3 } }, { coLeader: { id: 3 } }],
    });
  });

  it('returns sector scope for a sector co-leader', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 4,
      role: { slug: 'sector_leader' },
    });
    sectorRepo.findOne.mockResolvedValue({ id: 9 });
    lifeRepo.find.mockResolvedValue([{ id: 20 }, { id: 21 }]);
    const scope = await service.resolve(4);
    expect(scope).toMatchObject({
      unrestricted: false,
      sectorIds: [9],
      lifeGroupIds: [20, 21],
    });
  });

  it('returns area scope for an area co-leader', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 6,
      role: { slug: 'area_leader' },
    });
    areaRepo.findOne.mockResolvedValue({ id: 11 });
    sectorRepo.find.mockResolvedValue([{ id: 30 }, { id: 31 }]);
    lifeQueryBuilder.getMany.mockResolvedValue([{ id: 40 }, { id: 41 }]);
    const scope = await service.resolve(6);
    expect(scope).toMatchObject({
      unrestricted: false,
      areaIds: [11],
      sectorIds: [30, 31],
      lifeGroupIds: [40, 41],
    });
  });

  it('returns no scope when the user is not a leader/co-leader anywhere', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 8,
      role: { slug: 'member' },
    });
    const scope = await service.resolve(8);
    expect(scope).toMatchObject({
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [],
    });
  });
});
