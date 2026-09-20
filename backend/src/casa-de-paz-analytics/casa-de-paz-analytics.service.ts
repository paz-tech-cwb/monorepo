import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CasaDePazReport } from '../casa-de-paz-reports/entities/casa-de-paz-report.entity';
import { CasaDePazSummaryQueryDto } from './dto/casa-de-paz-summary-query.dto';
import { WEEKDAY_INDEX } from '../life-group-attendance/meeting-day.util';

const SECTOR_TOP_N = 10;
const OTHERS_LABEL = 'Outros';
const DEFAULT_WINDOW_MONTHS = 6;

export interface SeriesRow {
  period: string;
  houses: number;
  adults: number;
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
  ): { fromDate: Date; toDateExclusive: Date; fromYm: number; toYm: number } {
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
    const fromYm = from.getUTCFullYear() * 12 + from.getUTCMonth();
    const toYm = to.getUTCFullYear() * 12 + to.getUTCMonth();
    return { fromDate: from, toDateExclusive, fromYm, toYm };
  }

  private ymToPeriod(ym: number): string {
    const year = Math.floor(ym / 12);
    const month = (ym % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  async summary(query: CasaDePazSummaryQueryDto) {
    const { fromDate, toDateExclusive, fromYm, toYm } = this.resolveWindow(
      query.from,
      query.to,
    );

    const baseQb = () =>
      this.em
        .createQueryBuilder(CasaDePazReport, 'r')
        .where('r.deleted_at IS NULL')
        .andWhere('r.date >= :fromDate', { fromDate })
        .andWhere('r.date < :toDateExclusive', { toDateExclusive });

    // Previous period of equal length immediately preceding the selected
    // window, used to compute growth (e.g. "+12% vs. previous period").
    const windowMs = toDateExclusive.getTime() - fromDate.getTime();
    const prevToDateExclusive = fromDate;
    const prevFromDate = new Date(fromDate.getTime() - windowMs);
    const prevQb = () =>
      this.em
        .createQueryBuilder(CasaDePazReport, 'r')
        .where('r.deleted_at IS NULL')
        .andWhere('r.date >= :prevFromDate', { prevFromDate })
        .andWhere('r.date < :prevToDateExclusive', { prevToDateExclusive });

    const [
      totalsRaw,
      seriesRaw,
      bySectorRaw,
      byDayRaw,
      byTimeRaw,
      prevTotalsRaw,
    ] = await Promise.all([
      baseQb()
        .select('COUNT(*)', 'houses')
        .addSelect('COALESCE(SUM(r.adults), 0)', 'adults')
        .addSelect('COALESCE(SUM(r.kids), 0)', 'kids')
        .addSelect('COALESCE(SUM(r.guests), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .getRawOne<{
          houses: string;
          adults: string;
          kids: string;
          guests: string;
          conversions: string;
        }>(),
      baseQb()
        .select("to_char(r.date, 'YYYY-MM')", 'period')
        .addSelect('COUNT(*)', 'houses')
        .addSelect('COALESCE(SUM(r.adults), 0)', 'adults')
        .addSelect('COALESCE(SUM(r.kids), 0)', 'kids')
        .addSelect('COALESCE(SUM(r.guests), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .groupBy("to_char(r.date, 'YYYY-MM')")
        .orderBy("to_char(r.date, 'YYYY-MM')", 'ASC')
        .getRawMany<{
          period: string;
          houses: string;
          adults: string;
          kids: string;
          guests: string;
          conversions: string;
        }>(),
      baseQb()
        .innerJoin('sectors', 'sector', 'sector.id = r.sector_id')
        .select('sector.name', 'label')
        .addSelect('r.sector_id', 'sector_id')
        .addSelect('COUNT(*)', 'houses')
        .addSelect('COALESCE(SUM(r.adults), 0)', 'adults')
        .addSelect('COALESCE(SUM(r.kids), 0)', 'kids')
        .addSelect('COALESCE(SUM(r.guests), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .groupBy('sector.name')
        .addGroupBy('r.sector_id')
        .orderBy('houses', 'DESC')
        .getRawMany<{
          label: string;
          sector_id: string;
          houses: string;
          adults: string;
          kids: string;
          guests: string;
          conversions: string;
        }>(),
      baseQb()
        .select('r.meeting_day', 'label')
        .addSelect('COUNT(*)', 'houses')
        .addSelect('COALESCE(SUM(r.adults), 0)', 'adults')
        .addSelect('COALESCE(SUM(r.guests), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .andWhere('r.meeting_day IS NOT NULL')
        .groupBy('r.meeting_day')
        .getRawMany<{
          label: string;
          houses: string;
          adults: string;
          guests: string;
          conversions: string;
        }>(),
      baseQb()
        .select("substring(r.meeting_time, 1, 2) || ':00'", 'label')
        .addSelect('COUNT(*)', 'houses')
        .addSelect('COALESCE(SUM(r.adults), 0)', 'adults')
        .addSelect('COALESCE(SUM(r.guests), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .andWhere('r.meeting_time IS NOT NULL')
        .groupBy("substring(r.meeting_time, 1, 2) || ':00'")
        .orderBy("substring(r.meeting_time, 1, 2) || ':00'", 'ASC')
        .getRawMany<{
          label: string;
          houses: string;
          adults: string;
          guests: string;
          conversions: string;
        }>(),
      prevQb()
        .select('COUNT(*)', 'houses')
        .addSelect('COALESCE(SUM(r.adults), 0)', 'adults')
        .addSelect('COALESCE(SUM(r.kids), 0)', 'kids')
        .addSelect('COALESCE(SUM(r.guests), 0)', 'guests')
        .addSelect('COALESCE(SUM(r.conversions), 0)', 'conversions')
        .getRawOne<{
          houses: string;
          adults: string;
          kids: string;
          guests: string;
          conversions: string;
        }>(),
    ]);

    const totalGuests = Number(totalsRaw?.guests ?? 0);
    const totalConversions = Number(totalsRaw?.conversions ?? 0);
    const totalAdults = Number(totalsRaw?.adults ?? 0);
    const totalKids = Number(totalsRaw?.kids ?? 0);
    const totals = {
      houses: Number(totalsRaw?.houses ?? 0),
      adults: totalAdults,
      kids: totalKids,
      guests: totalGuests,
      // "Vidas alcançadas" — every person reached across all visits, the
      // headline ministry metric leadership actually tracks.
      lives: totalAdults + totalKids + totalGuests,
      conversions: totalConversions,
      conversion_rate: totalGuests > 0 ? totalConversions / totalGuests : 0,
    };

    const prevGuests = Number(prevTotalsRaw?.guests ?? 0);
    const prevConversions = Number(prevTotalsRaw?.conversions ?? 0);
    const prevAdults = Number(prevTotalsRaw?.adults ?? 0);
    const prevKids = Number(prevTotalsRaw?.kids ?? 0);
    const prevHouses = Number(prevTotalsRaw?.houses ?? 0);
    const prevLives = prevAdults + prevKids + prevGuests;

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

    const byPeriod = new Map<string, SeriesRow>(
      seriesRaw.map((r) => [
        r.period,
        {
          period: r.period,
          houses: Number(r.houses),
          adults: Number(r.adults),
          kids: Number(r.kids),
          guests: Number(r.guests),
          conversions: Number(r.conversions),
        },
      ]),
    );

    const series: SeriesRow[] = [];
    for (let ym = fromYm; ym <= toYm; ym += 1) {
      const period = this.ymToPeriod(ym);
      series.push(
        byPeriod.get(period) ?? {
          period,
          houses: 0,
          adults: 0,
          kids: 0,
          guests: 0,
          conversions: 0,
        },
      );
    }

    const bySector = this.bucketSectorsTopN(
      bySectorRaw.map((r) => ({
        label: r.label,
        sector_id: Number(r.sector_id),
        houses: Number(r.houses),
        adults: Number(r.adults),
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
        adults: Number(r.adults),
        guests: Number(r.guests),
        conversions: Number(r.conversions),
      }));

    const byTime = byTimeRaw.map((r) => ({
      label: r.label,
      houses: Number(r.houses),
      adults: Number(r.adults),
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
      series,
      by_sector: bySector,
      by_day: byDay,
      by_time: byTime,
    };
  }

  private bucketSectorsTopN(
    rows: {
      label: string;
      sector_id: number;
      houses: number;
      adults: number;
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
        adults: acc.adults + r.adults,
        kids: acc.kids + r.kids,
        guests: acc.guests + r.guests,
        conversions: acc.conversions + r.conversions,
      }),
      { houses: 0, adults: 0, kids: 0, guests: 0, conversions: 0 },
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
