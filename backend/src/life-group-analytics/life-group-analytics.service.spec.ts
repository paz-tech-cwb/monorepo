import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroupAnalyticsService } from './life-group-analytics.service';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { DistributionQueryDto } from './dto/distribution-query.dto';

interface MockQueryBuilder {
  select: jest.Mock<MockQueryBuilder, unknown[]>;
  addSelect: jest.Mock<MockQueryBuilder, unknown[]>;
  where: jest.Mock<MockQueryBuilder, unknown[]>;
  andWhere: jest.Mock<MockQueryBuilder, unknown[]>;
  leftJoin: jest.Mock<MockQueryBuilder, unknown[]>;
  groupBy: jest.Mock<MockQueryBuilder, unknown[]>;
  addGroupBy: jest.Mock<MockQueryBuilder, unknown[]>;
  orderBy: jest.Mock<MockQueryBuilder, unknown[]>;
  getRawMany: jest.Mock<Promise<unknown[]>, []>;
}

function makeQueryBuilder(rows: unknown[]): MockQueryBuilder {
  const qb: MockQueryBuilder = {
    select: jest.fn(() => qb),
    addSelect: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    leftJoin: jest.fn(() => qb),
    groupBy: jest.fn(() => qb),
    addGroupBy: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    getRawMany: jest.fn<Promise<unknown[]>, []>().mockResolvedValue(rows),
  };
  return qb;
}

describe('LifeGroupAnalyticsService', () => {
  const unrestrictedScope: ResolvedScope = {
    unrestricted: true,
    areaIds: [],
    sectorIds: [],
    lifeGroupIds: [],
  };
  const leaderScope: ResolvedScope = {
    unrestricted: false,
    areaIds: [],
    sectorIds: [],
    lifeGroupIds: [7],
  };
  const noAccessScope: ResolvedScope = {
    unrestricted: false,
    areaIds: [],
    sectorIds: [],
    lifeGroupIds: [],
  };
  const actor = { id: 42 };

  function createService(queryBuilders: unknown[][]) {
    let call = 0;
    const em = {
      createQueryBuilder: jest.fn(() => {
        const rows = queryBuilders[call] ?? [];
        call += 1;
        return makeQueryBuilder(rows);
      }),
    };
    return {
      service: new LifeGroupAnalyticsService(em as unknown as EntityManager),
      em,
    };
  }

  describe('scope guards', () => {
    it('returns empty rows when scope and led-group lookup both grant no access', async () => {
      // Even a no-access scope now triggers one query to check whether the
      // actor is the leader/co-leader of any group (Phase 1 parity) before
      // it can conclude access is truly empty.
      const { service, em } = createService([[]]);
      const result = await service.attendance(
        { year: 2026 } as AttendanceQueryDto,
        noAccessScope,
        actor,
      );
      expect(result.rows).toEqual([]);
      expect(em.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('returns empty distribution when scope and led-group lookup both grant no access', async () => {
      const { service, em } = createService([[]]);
      const result = await service.distribution(
        {} as DistributionQueryDto,
        noAccessScope,
        actor,
      );
      expect(result).toEqual({
        by_day: [],
        by_hour: [],
        by_neighborhood: [],
        by_city: [],
      });
      expect(em.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('rejects an explicit life_group_id outside the caller scope and led groups', async () => {
      const { service } = createService([[]]);
      await expect(
        service.attendance(
          { year: 2026, life_group_id: 99 } as AttendanceQueryDto,
          leaderScope,
          actor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an explicit life_group_id the caller has scope for', async () => {
      const { service } = createService([[], []]);
      const result = await service.attendance(
        { year: 2026, life_group_id: 7 } as AttendanceQueryDto,
        leaderScope,
        actor,
      );
      expect(result.rows).toHaveLength(12);
    });

    it('allows a life group the actor leads/co-leads even without scope access', async () => {
      const { service } = createService([[{ id: 55 }], []]);
      const result = await service.attendance(
        { year: 2026, life_group_id: 55 } as AttendanceQueryDto,
        noAccessScope,
        actor,
      );
      expect(result.rows).toHaveLength(12);
    });
  });

  describe('attendance', () => {
    it('zero-fills all 12 months and computes attendance_rate', async () => {
      const { service } = createService([
        [
          {
            period: '2026-03',
            meetings_count: '2',
            present_count: '15',
            members_count: '20',
          },
        ],
      ]);
      const result = await service.attendance(
        { year: 2026 } as AttendanceQueryDto,
        unrestrictedScope,
        actor,
      );
      expect(result.rows).toHaveLength(12);
      const march = result.rows.find((r) => r.period === '2026-03')!;
      expect(march.meetings_count).toBe(2);
      expect(march.attendance_rate).toBeCloseTo(0.75);
      const jan = result.rows.find((r) => r.period === '2026-01')!;
      expect(jan).toEqual({
        period: '2026-01',
        meetings_count: 0,
        present_count: 0,
        members_count: 0,
        attendance_rate: 0,
      });
    });

    it('requires month when granularity=meeting', async () => {
      const { service } = createService([]);
      await expect(
        service.attendance(
          { year: 2026, granularity: 'meeting' } as AttendanceQueryDto,
          unrestrictedScope,
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns per-meeting-date rows for granularity=meeting', async () => {
      // meeting_date is mocked as a plain string here because the service
      // selects it via to_char(a.meeting_date, 'YYYY-MM-DD'); a raw
      // getRawMany() without that cast would hand back a JS Date from pg's
      // date parser instead, which is exactly the bug this test guards
      // against.
      const { service } = createService([
        [
          {
            meeting_date: '2026-03-05',
            present_count: '5',
            members_count: '6',
          },
        ],
      ]);
      const result = await service.attendance(
        { year: 2026, month: 3, granularity: 'meeting' } as AttendanceQueryDto,
        unrestrictedScope,
        actor,
      );
      expect(result.rows).toEqual([
        {
          period: '2026-03-05',
          meetings_count: 1,
          present_count: 5,
          members_count: 6,
          attendance_rate: 5 / 6,
        },
      ]);
    });
  });

  describe('distribution', () => {
    it('orders weekdays via WEEKDAY_INDEX and buckets neighborhoods beyond top 10 into Outros', async () => {
      const manyNeighborhoods = Array.from({ length: 12 }, (_, i) => ({
        neighborhood: `N${i}`,
        count: String(12 - i),
      }));
      const { service } = createService([
        [
          { meeting_day: 'Quarta-feira', count: '3' },
          { meeting_day: 'Domingo', count: '5' },
        ],
        [{ hour: '19', count: '4' }],
        manyNeighborhoods,
        [{ city: 'Curitiba', count: '4' }],
      ]);
      const result = await service.distribution(
        {} as DistributionQueryDto,
        unrestrictedScope,
        actor,
      );
      expect(result.by_day.map((r) => r.label)).toEqual([
        'Domingo',
        'Quarta-feira',
      ]);
      expect(result.by_neighborhood).toHaveLength(11);
      const others = result.by_neighborhood.find((r) => r.label === 'Outros')!;
      expect(others.count).toBe(1 + 2); // sum of the two entries past top 10
    });
  });

  describe('overview', () => {
    it('aggregates kids, average members, sector counts and membership for an unrestricted caller', async () => {
      const { service } = createService([
        [
          {
            id: '1',
            kids_count: '3',
            sector_label: 'Norte',
            member_count: '4',
          },
          {
            id: '2',
            kids_count: '1',
            sector_label: 'Norte',
            member_count: '2',
          },
          { id: '3', kids_count: '0', sector_label: null, member_count: '0' },
        ],
        [
          { id: '10', life_group_count: '1' },
          { id: '11', life_group_count: '0' },
          { id: '12', life_group_count: '2' },
        ],
      ]);
      const result = await service.overview(unrestrictedScope, actor);
      expect(result.total_kids).toBe(4);
      expect(result.avg_members_per_group).toBeCloseTo(2, 1);
      expect(result.groups_by_sector).toEqual([
        { label: 'Norte', count: 2 },
        { label: 'Sem setor', count: 1 },
      ]);
      expect(result.members_total).toBe(3);
      expect(result.members_in_group).toBe(2);
    });

    it('returns all zeros when the caller has no access to any life group', async () => {
      const { service, em } = createService([[]]);
      const result = await service.overview(noAccessScope, actor);
      expect(result).toEqual({
        total_kids: 0,
        avg_members_per_group: 0,
        groups_by_sector: [],
        members_in_group: 0,
        members_total: 0,
      });
      expect(em.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('returns zero average when there are no groups but caller is unrestricted', async () => {
      const { service } = createService([[], []]);
      const result = await service.overview(unrestrictedScope, actor);
      expect(result.avg_members_per_group).toBe(0);
      expect(result.groups_by_sector).toEqual([]);
    });

    it('scopes the members universe to the caller sectors when restricted', async () => {
      const sectorScope: ResolvedScope = {
        unrestricted: false,
        areaIds: [],
        sectorIds: [3],
        lifeGroupIds: [7],
      };
      const { service } = createService([
        [],
        [{ id: '7', kids_count: '2', sector_label: 'Sul', member_count: '5' }],
        [{ id: '20', life_group_count: '1' }],
      ]);
      const result = await service.overview(sectorScope, actor);
      expect(result.members_total).toBe(1);
      expect(result.members_in_group).toBe(1);
    });

    it('derives the members universe from lifeGroupIds when a restricted caller has no sector scope (e.g. life_group_leader)', async () => {
      const sectorlessScope: ResolvedScope = {
        unrestricted: false,
        areaIds: [],
        sectorIds: [],
        lifeGroupIds: [7],
      };
      const { service, em } = createService([
        [],
        [{ id: '7', kids_count: '2', sector_label: 'Sul', member_count: '5' }],
        [
          { id: '30', life_group_count: '1' },
          { id: '31', life_group_count: '1' },
        ],
      ]);
      const result = await service.overview(sectorlessScope, actor);
      expect(result.members_total).toBe(2);
      expect(result.members_in_group).toBe(2);

      // The users query must be filtered by the caller's life group ids
      // (not sectorIds, which is empty for this caller type), since a
      // hard-coded 0 would silently misrepresent this leader's own group.
      const usersQb = em.createQueryBuilder.mock.results[2].value as {
        where: jest.Mock;
      };
      expect(usersQb.where).toHaveBeenCalledWith(
        'lg.id IN (:...lifeGroupIds)',
        {
          lifeGroupIds: [7],
        },
      );
    });

    it('still returns an empty members universe when a restricted caller has no sector scope and no life group scope', async () => {
      const noScope: ResolvedScope = {
        unrestricted: false,
        areaIds: [],
        sectorIds: [],
        lifeGroupIds: [],
      };
      const { service, em } = createService([[]]);
      const result = await service.overview(noScope, actor);
      expect(result).toEqual({
        total_kids: 0,
        avg_members_per_group: 0,
        groups_by_sector: [],
        members_in_group: 0,
        members_total: 0,
      });
      expect(em.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });
});
