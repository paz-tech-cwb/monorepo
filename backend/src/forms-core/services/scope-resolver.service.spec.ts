import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { Area } from '../../areas/entities/area.entity';
import { Sector } from '../../sectors/entities/sector.entity';
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

type IdCond = { id: number | { value: number[] } };
interface Where {
  leader?: { id: number };
  coLeader?: { id: number };
  area?: IdCond;
  sector?: IdCond;
}
type Row = AreaRow & { areaId?: number; sectorId?: number };

/**
 * Tiny in-memory stand-ins for the three repositories: `find` understands
 * exactly the `where` shapes the resolver uses (array of leader/coLeader
 * alternatives, `area.id` / `sector.id` with TypeORM's `In(...)` operator).
 */
function matches(row: Row, where: Where | Where[]): boolean {
  const alts = Array.isArray(where) ? where : [where];
  return alts.some((w) => {
    if (w.leader) return row.leaderId === w.leader.id;
    if (w.coLeader) return row.coLeaderId === w.coLeader.id;
    if (w.area) return inList(w.area.id, row.areaId);
    if (w.sector) return inList(w.sector.id, row.sectorId);
    return false;
  });
}

function inList(cond: IdCond['id'], value?: number): boolean {
  if (value === undefined) return false;
  // TypeORM's In(...) FindOperator exposes the list as `.value`.
  const list = typeof cond === 'number' ? [cond] : cond.value;
  return list.includes(value);
}

describe('ScopeResolverService', () => {
  let service: ScopeResolverService;
  let areas: AreaRow[];
  let sectors: SectorRow[];
  let groups: GroupRow[];
  const userRepo = { findOne: jest.fn() };

  const repo = (rows: () => Row[]) => ({
    find: jest.fn(({ where }: { where: Where | Where[] }) =>
      Promise.resolve(rows().filter((r) => matches(r, where))),
    ),
  });

  const asUser = (id: number, slug: string) =>
    userRepo.findOne.mockResolvedValue({ id, role: { slug } });

  beforeEach(async () => {
    areas = [];
    sectors = [];
    groups = [];
    userRepo.findOne.mockReset();
    const m = await Test.createTestingModule({
      providers: [
        ScopeResolverService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(LifeGroup),
          useValue: repo(() => groups),
        },
        { provide: getRepositoryToken(Area), useValue: repo(() => areas) },
        { provide: getRepositoryToken(Sector), useValue: repo(() => sectors) },
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
