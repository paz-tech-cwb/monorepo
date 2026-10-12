import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { ScopeResolverService } from './scope-resolver.service';

interface AreaRow {
  id: number;
  leaderId?: number;
  coLeaderId?: number;
}
interface SectorRow extends AreaRow {
  areaId?: number;
}
interface GroupRow extends AreaRow {
  sectorId?: number;
}

/**
 * In-memory interpreter of the single resolver query (areas led -> their
 * sectors, plus led sectors -> their groups, plus led groups). The real SQL
 * is validated against Postgres separately (see .pipeline/test-results.md).
 */
describe('ScopeResolverService', () => {
  let service: ScopeResolverService;
  let areas: AreaRow[];
  let sectors: SectorRow[];
  let groups: GroupRow[];
  const userRepo = { findOne: jest.fn(), query: jest.fn() };

  const led = (r: AreaRow, uid: number) =>
    r.leaderId === uid || r.coLeaderId === uid;

  const runQuery = (_sql: string, params: unknown[]) => {
    const uid = params[0] as number;
    const ledAreas = areas.filter((a) => led(a, uid)).map((a) => a.id);
    const ledSectors = sectors.filter(
      (s) =>
        led(s, uid) || (s.areaId !== undefined && ledAreas.includes(s.areaId)),
    );
    const sectorIds = ledSectors.map((s) => s.id);
    const ledGroups = groups.filter(
      (g) =>
        led(g, uid) ||
        (g.sectorId !== undefined && sectorIds.includes(g.sectorId)),
    );
    // UNION semantics: distinct rows.
    return Promise.resolve([
      ...ledAreas.map((id) => ({ kind: 'area', id })),
      ...sectorIds.map((id) => ({ kind: 'sector', id })),
      ...ledGroups.map((g) => ({ kind: 'group', id: g.id })),
    ]);
  };

  const asUser = (id: number, slug: string) =>
    userRepo.findOne.mockResolvedValue({ id, role: { slug } });

  beforeEach(async () => {
    areas = [];
    sectors = [];
    groups = [];
    userRepo.findOne.mockReset();
    userRepo.query.mockReset();
    userRepo.query.mockImplementation(runQuery);
    const m = await Test.createTestingModule({
      providers: [
        ScopeResolverService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();
    service = m.get(ScopeResolverService);
  });

  it('returns unrestricted for admin', async () => {
    asUser(1, 'admin');
    const scope = await service.resolve(1);
    expect(scope).toEqual({
      unrestricted: true,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [],
    });
  });

  it('returns unrestricted for pastor even when also leading rows', async () => {
    asUser(1, 'pastor');
    areas = [{ id: 1, leaderId: 1 }];
    const scope = await service.resolve(1);
    expect(scope.unrestricted).toBe(true);
    expect(scope.areaIds).toEqual([]);
  });

  it('throws for an unknown user', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.resolve(99)).rejects.toThrow('not found');
  });

  it('life group leader gets only their group', async () => {
    asUser(2, 'life_group_leader');
    groups = [
      { id: 5, leaderId: 2 },
      { id: 6, leaderId: 9 },
    ];
    expect(await service.resolve(2)).toEqual({
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [5],
    });
  });

  it('life group leader of several groups gets all of them (not just the first)', async () => {
    asUser(2, 'life_group_leader');
    groups = [
      { id: 5, leaderId: 2 },
      { id: 6, coLeaderId: 2 },
      { id: 7, leaderId: 3 },
    ];
    const scope = await service.resolve(2);
    expect(scope.lifeGroupIds.sort((a, b) => a - b)).toEqual([5, 6]);
  });

  it('sector co-leader gets every group of the sector', async () => {
    asUser(4, 'sector_leader');
    sectors = [{ id: 9, coLeaderId: 4 }];
    groups = [
      { id: 20, sectorId: 9 },
      { id: 21, sectorId: 9 },
      { id: 22, sectorId: 10 },
    ];
    expect(await service.resolve(4)).toEqual({
      unrestricted: false,
      areaIds: [],
      sectorIds: [9],
      lifeGroupIds: [20, 21],
    });
  });

  it('sector leader of several sectors gets all their groups', async () => {
    asUser(4, 'sector_leader');
    sectors = [
      { id: 9, leaderId: 4 },
      { id: 10, coLeaderId: 4 },
      { id: 11, leaderId: 8 },
    ];
    groups = [
      { id: 20, sectorId: 9 },
      { id: 21, sectorId: 10 },
      { id: 22, sectorId: 11 },
    ];
    const scope = await service.resolve(4);
    expect(scope.sectorIds.sort((a, b) => a - b)).toEqual([9, 10]);
    expect(scope.lifeGroupIds.sort((a, b) => a - b)).toEqual([20, 21]);
  });

  it('area leader of several areas (leader and co-leader) gets every sector and group', async () => {
    asUser(6, 'area_leader');
    areas = [
      { id: 11, leaderId: 6 },
      { id: 12, coLeaderId: 6 },
      { id: 13, leaderId: 1 },
    ];
    sectors = [
      { id: 30, areaId: 11 },
      { id: 31, areaId: 12 },
      { id: 32, areaId: 13 },
    ];
    groups = [
      { id: 40, sectorId: 30 },
      { id: 41, sectorId: 31 },
      { id: 42, sectorId: 32 },
    ];
    const scope = await service.resolve(6);
    expect(scope.areaIds.sort((a, b) => a - b)).toEqual([11, 12]);
    expect(scope.sectorIds.sort((a, b) => a - b)).toEqual([30, 31]);
    expect(scope.lifeGroupIds.sort((a, b) => a - b)).toEqual([40, 41]);
  });

  it('unions area sectors, directly led sectors and directly led groups without duplicates', async () => {
    asUser(6, 'area_leader');
    areas = [{ id: 11, leaderId: 6 }];
    sectors = [
      { id: 30, areaId: 11, leaderId: 6 }, // also led directly: counted once
      { id: 33, areaId: 99, coLeaderId: 6 },
    ];
    groups = [
      { id: 40, sectorId: 30, leaderId: 6 }, // also led directly: counted once
      { id: 43, sectorId: 33 },
      { id: 44, sectorId: 77, coLeaderId: 6 }, // outside both: led directly
      { id: 45, sectorId: 77 },
    ];
    const scope = await service.resolve(6);
    expect(scope.areaIds).toEqual([11]);
    expect(scope.sectorIds.sort((a, b) => a - b)).toEqual([30, 33]);
    expect(scope.lifeGroupIds.sort((a, b) => a - b)).toEqual([40, 43, 44]);
  });

  it('grants scope from leader rows even when the role slug is not a leader slug', async () => {
    asUser(7, 'member');
    areas = [{ id: 11, leaderId: 7 }];
    sectors = [{ id: 30, areaId: 11 }];
    groups = [{ id: 40, sectorId: 30 }];
    expect(await service.resolve(7)).toEqual({
      unrestricted: false,
      areaIds: [11],
      sectorIds: [30],
      lifeGroupIds: [40],
    });
  });

  it('a slug without any leader row keeps an empty scope', async () => {
    asUser(7, 'area_leader');
    areas = [{ id: 11, leaderId: 1 }];
    sectors = [{ id: 30, areaId: 11 }];
    groups = [{ id: 40, sectorId: 30 }];
    expect(await service.resolve(7)).toEqual({
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [],
    });
  });

  it('returns no scope for a plain member (no widening)', async () => {
    asUser(8, 'member');
    groups = [{ id: 40, sectorId: 30, leaderId: 1 }];
    expect(await service.resolve(8)).toEqual({
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [],
    });
  });
});

describe('ScopeResolverService query economy', () => {
  it('runs one user lookup plus a single ids-only query for non-admins, and no led-rows query for admin', async () => {
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 3, role: { slug: 'member' } }),
      query: jest.fn().mockResolvedValue([{ kind: 'group', id: '5' }]),
    };
    const m = await Test.createTestingModule({
      providers: [
        ScopeResolverService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();
    const svc = m.get(ScopeResolverService);

    // pg returns bigint/int ids as numbers or strings depending on type: normalized.
    expect(await svc.resolve(3)).toEqual({
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [5],
    });
    expect(userRepo.findOne).toHaveBeenCalledTimes(1);
    expect(userRepo.query).toHaveBeenCalledTimes(1);
    expect(userRepo.query).toHaveBeenCalledWith(expect.any(String), [3]);

    userRepo.query.mockClear();
    userRepo.findOne.mockResolvedValue({ id: 1, role: { slug: 'admin' } });
    await svc.resolve(1);
    expect(userRepo.query).not.toHaveBeenCalled();
  });
});
