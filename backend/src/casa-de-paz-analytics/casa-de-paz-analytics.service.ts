import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { CasaDePazReport } from '../casa-de-paz-reports/entities/casa-de-paz-report.entity';
import { CasaDePazSummaryQueryDto } from './dto/casa-de-paz-summary-query.dto';
import { WEEKDAY_INDEX } from '../life-group-attendance/meeting-day.util';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';

const SECTOR_TOP_N = 10;
const OTHERS_LABEL = 'Outros';
const DEFAULT_WINDOW_MONTHS = 6;

// Pre-aggregated per-report guest counts, LEFT JOINed once onto the main
// query. Joining the raw casa_de_paz_report_guests rows directly would fan
// out the main aggregation (a single report with N guests would multiply
// its houses/kids/conversions sums by N) — this subquery avoids that.
const GUEST_COUNTS_SUBQUERY =
  '(SELECT report_id, COUNT(*) AS guest_count FROM casa_de_paz_report_guests GROUP BY report_id)';

function withGuestCounts<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
): SelectQueryBuilder<T> {
  return qb.leftJoin(GUEST_COUNTS_SUBQUERY, 'gc', 'gc.report_id = r.id');
}

export interface SeriesRow {
  period: string;
  houses: number;
  kids: number;
  guests: number;
  conversions: number;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class CasaDePazAnalyticsService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // `from`/`to` are explicit calendar dates (inclusive) rather than a
  // year+month-count window — the admin picks a date range directly. When
  // omitted: `to` defaults to today, `from` defaults to the first day of
  // the month DEFAULT_WINDOW_MONTHS-1 months back.
  private resolveWindow(
    fromStr: string | undefined,
    toStr: string | undefined,
  ): { fromDate: Date; toDateExclusive: Date } {
    const to = toStr ? new Date(`${toStr}T00:00:00.000Z`) : new Date();
    const toDateExclusive = new Date(
      Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + 1),
    );
    const defaultFrom = new Date(
      Date.UTC(
        to.getUTCFullYear(),
        to.getUTCMonth() - (DEFAULT_WINDOW_MONTHS - 1),
        1,
      ),
    );
    const from = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : defaultFrom;
    return { fromDate: from, toDateExclusive };
  }

  async summary(query: CasaDePazSummaryQueryDto, scope: ResolvedScope) {
    // Sector-restricted callers (e.g. life_group_leader, who is granted
    // access to this LEADERSHIP_ROLES-gated endpoint but has no sector
    // scope) must never see other sectors' data. Mirrors the
    // LifeGroupAnalyticsService.overview precedent for a restricted caller
    // with an empty scope: return a zeroed/empty summary rather than
    // silently running the query unfiltered.
    const restrictedSectorIds = scope.unrestricted ? null : scope.sectorIds;
    if (restrictedSectorIds !== null && restrictedSectorIds.length === 0) {
      return this.emptySummary(query.from, query.to);
    }

    const { fromDate, toDateExclusive } = this.resolveWindow(
      query.from,
      query.to,
    );

    const applySectorScope = <T extends { andWhere: (...args: any[]) => T }>(
      qb: T,
    ): T =>
      restrictedSectorIds !== null
        ? qb.andWhere('r.sector_id IN (:...sectorIds)', {
            sectorIds: restrictedSectorIds,
          })
        : qb;

    const baseQb = () =>
      applySectorScope(
        withGuestCounts(
          this.em
            .createQueryBuilder(CasaDePazReport, 'r')
            .where('r.deleted_at IS NULL')
            .andWhere('r.date >= :fromDate', { fromDate })
            .andWhere('r.date < :toDateExclusive', { toDateExclusive }),
        ),
      );

    // Comparison period = the single most recent month (strictly before the
    // selected window) that actually has report rows — not a fixed
    // equal-length window. This avoids comparing against empty months when
    // data collection only recently started or has gaps.
    const prevMonthRow = await applySectorScope(
      this.em
        .createQueryBuilder(CasaDePazReport, 'r')
        .select("to_char(r.date, 'YYYY-MM')", 'period')
        .where('r.deleted_at IS NULL')
        .andWhere('r.date < :fromDate', { fromDate }),
    )
      .groupBy("to_char(r.date, 'YYYY-MM')")
      .orderBy("to_char(r.date, 'YYYY-MM')", 'DESC')
      .limit(1)
      .getRawOne<{ period: string }>();

    const prevPeriod = prevMonthRow?.period ?? null;
    const prevQb = () =>
      applySectorScope(
        withGuestCounts(
          this.em
            .createQueryBuilder(CasaDePazReport, 'r')
            .where('r.deleted_at IS NULL')
            .andWhere("to_char(r.date, 'YYYY-MM') = :prevPeriod", {
              prevPeriod,
            })
            .andWhere('r.date < :fromDate', { fromDate }),
        ),
      );

    const [
      totalsRaw,
      seriesRaw,
      bySectorRaw,
      byDayRaw,
      byTimeRaw,
      prevTotalsRaw,
    ] = await Promise.all([
      baseQb()
        .select('COUNT(DISTINCT r.id)', 'houses')
        .addSelect('COALESCE(SUM(r.kids), 0)', 'kids')
        .addSelect('COALESCE(SUM(gc.guest_count), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .getRawOne<{
          houses: string;
          kids: string;
          guests: string;
          conversions: string;
        }>(),
      baseQb()
        .select("to_char(r.date, 'YYYY-MM')", 'period')
        .addSelect('COUNT(DISTINCT r.id)', 'houses')
        .addSelect('COALESCE(SUM(r.kids), 0)', 'kids')
        .addSelect('COALESCE(SUM(gc.guest_count), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .groupBy("to_char(r.date, 'YYYY-MM')")
        .orderBy("to_char(r.date, 'YYYY-MM')", 'ASC')
        .getRawMany<{
          period: string;
          houses: string;
          kids: string;
          guests: string;
          conversions: string;
        }>(),
      baseQb()
        .innerJoin('sectors', 'sector', 'sector.id = r.sector_id')
        .select('sector.name', 'label')
        .addSelect('r.sector_id', 'sector_id')
        .addSelect('COUNT(DISTINCT r.id)', 'houses')
        .addSelect('COALESCE(SUM(r.kids), 0)', 'kids')
        .addSelect('COALESCE(SUM(gc.guest_count), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .groupBy('sector.name')
        .addGroupBy('r.sector_id')
        .orderBy('houses', 'DESC')
        .getRawMany<{
          label: string;
          sector_id: string;
          houses: string;
          kids: string;
          guests: string;
          conversions: string;
        }>(),
      baseQb()
        .select('r.meeting_day', 'label')
        .addSelect('COUNT(DISTINCT r.id)', 'houses')
        .addSelect('COALESCE(SUM(gc.guest_count), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .andWhere('r.meeting_day IS NOT NULL')
        .groupBy('r.meeting_day')
        .getRawMany<{
          label: string;
          houses: string;
          guests: string;
          conversions: string;
        }>(),
      baseQb()
        .select("substring(r.meeting_time, 1, 2) || ':00'", 'label')
        .addSelect('COUNT(DISTINCT r.id)', 'houses')
        .addSelect('COALESCE(SUM(gc.guest_count), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .andWhere('r.meeting_time IS NOT NULL')
        .groupBy("substring(r.meeting_time, 1, 2) || ':00'")
        .orderBy("substring(r.meeting_time, 1, 2) || ':00'", 'ASC')
        .getRawMany<{
          label: string;
          houses: string;
          guests: string;
          conversions: string;
        }>(),
      prevPeriod
        ? prevQb()
            .select('COUNT(DISTINCT r.id)', 'houses')
            .addSelect('COALESCE(SUM(r.kids), 0)', 'kids')
            .addSelect('COALESCE(SUM(gc.guest_count), 0)', 'guests')
            .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
            .getRawOne<{
              houses: string;
              kids: string;
              guests: string;
              conversions: string;
            }>()
        : Promise.resolve(undefined),
    ]);

    const totalGuests = Number(totalsRaw?.guests ?? 0);
    const totalConversions = Number(totalsRaw?.conversions ?? 0);
    const totalKids = Number(totalsRaw?.kids ?? 0);
    const totals = {
      houses: Number(totalsRaw?.houses ?? 0),
      kids: totalKids,
      guests: totalGuests,
      // "Vidas alcançadas" — every person reached across all visits, the
      // headline ministry metric leadership actually tracks.
      lives: totalKids + totalGuests,
      conversions: totalConversions,
      conversion_rate: totalGuests > 0 ? totalConversions / totalGuests : 0,
    };

    const prevGuests = Number(prevTotalsRaw?.guests ?? 0);
    const prevConversions = Number(prevTotalsRaw?.conversions ?? 0);
    const prevKids = Number(prevTotalsRaw?.kids ?? 0);
    const prevHouses = Number(prevTotalsRaw?.houses ?? 0);
    const prevLives = prevKids + prevGuests;

    // null growth means "no previous-period data to compare against" — the
    // frontend renders that as neutral/no-badge rather than a fake "+100%".
    const pctChange = (current: number, previous: number): number | null =>
      previous > 0 ? (current - previous) / previous : null;

    const growth = {
      houses: pctChange(totals.houses, prevHouses),
      lives: pctChange(totals.lives, prevLives),
      guests: pctChange(totals.guests, prevGuests),
      conversions: pctChange(totals.conversions, prevConversions),
    };

    // Only months that actually have report rows are included — no
    // zero-filled gaps, since sparse data can span multiple years.
    const series: SeriesRow[] = seriesRaw.map((r) => ({
      period: r.period,
      houses: Number(r.houses),
      kids: Number(r.kids),
      guests: Number(r.guests),
      conversions: Number(r.conversions),
    }));

    const bySector = this.bucketSectorsTopN(
      bySectorRaw.map((r) => ({
        label: r.label,
        sector_id: Number(r.sector_id),
        houses: Number(r.houses),
        kids: Number(r.kids),
        guests: Number(r.guests),
        conversions: Number(r.conversions),
      })),
    );

    const byDay = [...byDayRaw]
      .sort(
        (a, b) =>
          (WEEKDAY_INDEX[a.label] ?? 99) - (WEEKDAY_INDEX[b.label] ?? 99),
      )
      .map((r) => ({
        label: r.label,
        houses: Number(r.houses),
        guests: Number(r.guests),
        conversions: Number(r.conversions),
      }));

    const byTime = byTimeRaw.map((r) => ({
      label: r.label,
      houses: Number(r.houses),
      guests: Number(r.guests),
      conversions: Number(r.conversions),
    }));

    return {
      range: {
        from: toIsoDate(fromDate),
        to: toIsoDate(new Date(toDateExclusive.getTime() - 86_400_000)),
      },
      totals,
      growth,
      comparison: prevPeriod ? { period: prevPeriod } : null,
      series,
      by_sector: bySector,
      by_day: byDay,
      by_time: byTime,
    };
  }

  private emptySummary(fromStr: string | undefined, toStr: string | undefined) {
    const { fromDate, toDateExclusive } = this.resolveWindow(fromStr, toStr);
    return {
      range: {
        from: toIsoDate(fromDate),
        to: toIsoDate(new Date(toDateExclusive.getTime() - 86_400_000)),
      },
      totals: {
        houses: 0,
        kids: 0,
        guests: 0,
        lives: 0,
        conversions: 0,
        conversion_rate: 0,
      },
      growth: {
        houses: null,
        lives: null,
        guests: null,
        conversions: null,
      },
      comparison: null,
      series: [] as SeriesRow[],
      by_sector: [] as {
        label: string;
        sector_id: number;
        houses: number;
        kids: number;
        guests: number;
        conversions: number;
      }[],
      by_day: [] as {
        label: string;
        houses: number;
        guests: number;
        conversions: number;
      }[],
      by_time: [] as {
        label: string;
        houses: number;
        guests: number;
        conversions: number;
      }[],
    };
  }

  private bucketSectorsTopN(
    rows: {
      label: string;
      sector_id: number;
      houses: number;
      kids: number;
      guests: number;
      conversions: number;
    }[],
  ) {
    if (rows.length <= SECTOR_TOP_N) return rows;
    const top = rows.slice(0, SECTOR_TOP_N);
    const rest = rows.slice(SECTOR_TOP_N);
    const others = rest.reduce(
      (acc, r) => ({
        houses: acc.houses + r.houses,
        kids: acc.kids + r.kids,
        guests: acc.guests + r.guests,
        conversions: acc.conversions + r.conversions,
      }),
      { houses: 0, kids: 0, guests: 0, conversions: 0 },
    );
    return [
      ...top,
      {
        label: OTHERS_LABEL,
        sector_id: null as unknown as number,
        ...others,
      },
    ];
  }
}
