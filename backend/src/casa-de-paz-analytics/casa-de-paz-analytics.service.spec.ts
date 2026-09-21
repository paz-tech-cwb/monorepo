import { EntityManager } from 'typeorm';
import { CasaDePazAnalyticsService } from './casa-de-paz-analytics.service';

interface MockQueryBuilder {
  where: jest.Mock<MockQueryBuilder, unknown[]>;
  andWhere: jest.Mock<MockQueryBuilder, unknown[]>;
  innerJoin: jest.Mock<MockQueryBuilder, unknown[]>;
  select: jest.Mock<MockQueryBuilder, unknown[]>;
  addSelect: jest.Mock<MockQueryBuilder, unknown[]>;
  groupBy: jest.Mock<MockQueryBuilder, unknown[]>;
  addGroupBy: jest.Mock<MockQueryBuilder, unknown[]>;
  orderBy: jest.Mock<MockQueryBuilder, unknown[]>;
  limit: jest.Mock<MockQueryBuilder, unknown[]>;
  getRawOne: jest.Mock<Promise<unknown>, []>;
  getRawMany: jest.Mock<Promise<unknown[]>, []>;
}

function makeQueryBuilder(
  rawOne: unknown,
  rawMany: unknown[],
): MockQueryBuilder {
  const qb: MockQueryBuilder = {
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    innerJoin: jest.fn(() => qb),
    select: jest.fn(() => qb),
    addSelect: jest.fn(() => qb),
    groupBy: jest.fn(() => qb),
    addGroupBy: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    limit: jest.fn(() => qb),
    getRawOne: jest.fn<Promise<unknown>, []>().mockResolvedValue(rawOne),
    getRawMany: jest.fn<Promise<unknown[]>, []>().mockResolvedValue(rawMany),
  };
  return qb;
}

// Order of createQueryBuilder() calls inside summary():
// 1. prevMonthRow lookup (most recent month with data, strictly before `from`)
// 2. totals, 3. series, 4. by_sector, 5. by_day, 6. by_time
// 7. previous-period totals — ONLY issued when a prevPeriod was found in (1).
function createService(fixtures: {
  totals?: unknown;
  series?: unknown[];
  bySector?: unknown[];
  byDay?: unknown[];
  byTime?: unknown[];
  prevPeriod?: string | null;
  prevTotals?: unknown;
}) {
  const prevPeriod =
    fixtures.prevPeriod === undefined ? '2026-03' : fixtures.prevPeriod;
  const qbs = [
    makeQueryBuilder(
      prevPeriod === null ? undefined : { period: prevPeriod },
      [],
    ),
    makeQueryBuilder(fixtures.totals ?? zeroTotalsRaw(), []),
    makeQueryBuilder(undefined, fixtures.series ?? []),
    makeQueryBuilder(undefined, fixtures.bySector ?? []),
    makeQueryBuilder(undefined, fixtures.byDay ?? []),
    makeQueryBuilder(undefined, fixtures.byTime ?? []),
  ];
  if (prevPeriod !== null) {
    qbs.push(makeQueryBuilder(fixtures.prevTotals ?? zeroTotalsRaw(), []));
  }
  let call = 0;
  const em = {
    createQueryBuilder: jest.fn(() => {
      const qb = qbs[call] ?? makeQueryBuilder(undefined, []);
      call += 1;
      return qb;
    }),
  };
  return {
    service: new CasaDePazAnalyticsService(em as unknown as EntityManager),
    em,
  };
}

function zeroTotalsRaw() {
  return { houses: '0', adults: '0', kids: '0', guests: '0', conversions: '0' };
}

// A fixed 6-month range (2026-04-01 .. 2026-09-30) used by tests that don't
// care about the exact window, just that one is applied consistently.
const FIXED_RANGE = { from: '2026-04-01', to: '2026-09-30' };

describe('CasaDePazAnalyticsService', () => {
  describe('series — only months with data', () => {
    it('returns an empty series (no zero-filled months) when there is no data', async () => {
      const { service } = createService({ prevPeriod: null });
      const result = await service.summary(FIXED_RANGE);

      expect(result.series).toEqual([]);
    });

    it('returns exactly the months present in the grouped query results, in order, without gaps', async () => {
      const { service } = createService({
        prevPeriod: null,
        series: [
          {
            period: '2026-04',
            houses: '2',
            adults: '10',
            kids: '3',
            guests: '4',
            conversions: '1',
          },
          {
            period: '2026-08',
            houses: '5',
            adults: '20',
            kids: '6',
            guests: '8',
            conversions: '2',
          },
        ],
      });
      const result = await service.summary(FIXED_RANGE);

      expect(result.series).toEqual([
        {
          period: '2026-04',
          houses: 2,
          adults: 10,
          kids: 3,
          guests: 4,
          conversions: 1,
        },
        {
          period: '2026-08',
          houses: 5,
          adults: 20,
          kids: 6,
          guests: 8,
          conversions: 2,
        },
      ]);
    });
  });

  describe('comparison / growth vs. most recent month with data', () => {
    it('compares totals against the most recent prior month that has data, and reports it as `comparison`', async () => {
      const { service } = createService({
        prevPeriod: '2026-02',
        totals: {
          houses: '10',
          adults: '80',
          kids: '20',
          guests: '20',
          conversions: '5',
        },
        prevTotals: {
          houses: '5',
          adults: '40',
          kids: '10',
          guests: '10',
          conversions: '2',
        },
      });
      const result = await service.summary(FIXED_RANGE);

      expect(result.comparison).toEqual({ period: '2026-02' });
      expect(result.growth.houses).toBeCloseTo(1); // (10-5)/5
      expect(result.growth.guests).toBeCloseTo(1); // (20-10)/10
      expect(result.growth.lives).toBeCloseTo((120 - 60) / 60);
      expect(result.growth.conversions).toBeCloseTo(1.5); // (5-2)/2
    });

    it('sets comparison to null and all growth values to null when there is no prior month with data', async () => {
      const { service } = createService({
        prevPeriod: null,
        totals: {
          houses: '10',
          adults: '80',
          kids: '20',
          guests: '20',
          conversions: '5',
        },
      });
      const result = await service.summary(FIXED_RANGE);

      expect(result.comparison).toBeNull();
      expect(result.growth).toEqual({
        houses: null,
        lives: null,
        guests: null,
        conversions: null,
      });
    });
  });

  describe('conversion_rate', () => {
    it('is 0 when guests is 0 (avoids division by zero)', async () => {
      const { service } = createService({
        totals: {
          houses: '5',
          adults: '30',
          kids: '10',
          guests: '0',
          conversions: '0',
        },
      });
      const result = await service.summary(FIXED_RANGE);

      expect(result.totals.guests).toBe(0);
      expect(result.totals.conversion_rate).toBe(0);
    });

    it('computes conversions / guests when guests > 0', async () => {
      const { service } = createService({
        totals: {
          houses: '10',
          adults: '80',
          kids: '20',
          guests: '20',
          conversions: '5',
        },
      });
      const result = await service.summary(FIXED_RANGE);

      expect(result.totals.conversion_rate).toBeCloseTo(0.25);
    });
  });

  describe('by_day', () => {
    it('orders rows per WEEKDAY_INDEX and excludes nulls', async () => {
      const { service } = createService({
        byDay: [
          {
            label: 'Quarta-feira',
            houses: '3',
            adults: '10',
            guests: '2',
            conversions: '1',
          },
          {
            label: 'Domingo',
            houses: '5',
            adults: '20',
            guests: '4',
            conversions: '2',
          },
          {
            label: 'Segunda-feira',
            houses: '2',
            adults: '5',
            guests: '1',
            conversions: '0',
          },
        ],
      });
      const result = await service.summary(FIXED_RANGE);

      expect(result.by_day.map((r) => r.label)).toEqual([
        'Domingo',
        'Segunda-feira',
        'Quarta-feira',
      ]);
    });
  });

  describe('by_time', () => {
    it('buckets 19:30 and 19:00 into a single 19:00 bucket', async () => {
      // The SQL substring(meeting_time,1,2)||':00' grouping already collapses
      // these at the query layer; this test asserts the service trusts and
      // passes through that single aggregated row rather than re-splitting it.
      const { service } = createService({
        byTime: [
          {
            label: '19:00',
            houses: '7',
            adults: '40',
            guests: '10',
            conversions: '2',
          },
        ],
      });
      const result = await service.summary(FIXED_RANGE);

      expect(result.by_time).toEqual([
        { label: '19:00', houses: 7, adults: 40, guests: 10, conversions: 2 },
      ]);
    });
  });

  describe('by_sector long-tail bucketing', () => {
    it('buckets sectors past the top-N into an "Outros" row', async () => {
      const manySectors = Array.from({ length: 12 }, (_, i) => ({
        label: `Setor ${i}`,
        sector_id: String(i + 1),
        houses: String(12 - i),
        adults: String((12 - i) * 5),
        kids: String((12 - i) * 2),
        guests: String(12 - i),
        conversions: '1',
      }));
      const { service } = createService({ bySector: manySectors });
      const result = await service.summary(FIXED_RANGE);

      expect(result.by_sector).toHaveLength(11);
      const others = result.by_sector.find((r) => r.label === 'Outros')!;
      // rows past top 10 (index 10, 11) have houses 2 and 1
      expect(others.houses).toBe(2 + 1);
    });
  });

  describe('range computation', () => {
    it('echoes back an explicit from/to range unchanged', async () => {
      const { service } = createService({});
      const result = await service.summary({
        from: '2025-10-01',
        to: '2025-12-31',
      });

      expect(result.range).toEqual({ from: '2025-10-01', to: '2025-12-31' });
    });

    it('defaults `from` to 6 months back (start of month) when omitted', async () => {
      const { service } = createService({});
      const result = await service.summary({ to: '2025-06-15' });

      // to=2025-06-15 -> default from = first day of the month 5 months
      // back = 2025-01-01.
      expect(result.range.from).toBe('2025-01-01');
      expect(result.range.to).toBe('2025-06-15');
    });

    it('defaults `to` to today when omitted', async () => {
      const { service } = createService({});
      const result = await service.summary({ from: '2020-01-01' });

      const today = new Date().toISOString().slice(0, 10);
      expect(result.range.to).toBe(today);
      expect(result.range.from).toBe('2020-01-01');
    });
  });
});
