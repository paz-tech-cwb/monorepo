import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CasaDePazReport } from '../casa-de-paz-reports/entities/casa-de-paz-report.entity';
import { CasaDePazSummaryQueryDto } from './dto/casa-de-paz-summary-query.dto';
import { WEEKDAY_INDEX } from '../life-group-attendance/meeting-day.util';

const SECTOR_TOP_N = 10;
const OTHERS_LABEL = 'Outros';
const DEFAULT_MONTHS = 12;

export interface SeriesRow {
  period: string;
  houses: number;
  adults: number;
  kids: number;
  guests: number;
  conversions: number;
}

@Injectable()
export class CasaDePazAnalyticsService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // The window is the last `months` calendar months ending at the last
  // month of `year` (Dec), except when `year` is the current calendar
  // year, in which case the window ends at the current month — mirroring
  // how the life-group-analytics dashboards default to "up to now" instead
  // of projecting into months that haven't happened yet.
  private resolveWindow(
    year: number,
    months: number,
  ): { fromYm: number; toYm: number } {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const endMonth =
      year === currentYear ? now.getUTCMonth() + 1 : DEFAULT_MONTHS;
    const toYm = year * 12 + (endMonth - 1); // 0-indexed absolute month
    const fromYm = toYm - (months - 1);
    return { fromYm, toYm };
  }

  private ymToPeriod(ym: number): string {
    const year = Math.floor(ym / 12);
    const month = (ym % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private ymToDate(ym: number): Date {
    const year = Math.floor(ym / 12);
    const month = ym % 12;
    return new Date(Date.UTC(year, month, 1));
  }

  async summary(query: CasaDePazSummaryQueryDto) {
    const year = query.year ?? new Date().getUTCFullYear();
    const months = query.months ?? DEFAULT_MONTHS;
    const { fromYm, toYm } = this.resolveWindow(year, months);
    const fromDate = this.ymToDate(fromYm);
    // Exclusive end bound: first day of the month AFTER the window's last
    // month, so the range covers the entire last month.
    const toDateExclusive = this.ymToDate(toYm + 1);

    const baseQb = () =>
      this.em
        .createQueryBuilder(CasaDePazReport, 'r')
        .where('r.deleted_at IS NULL')
        .andWhere('r.date >= :fromDate', { fromDate })
        .andWhere('r.date < :toDateExclusive', { toDateExclusive });

    const [totalsRaw, seriesRaw, bySectorRaw, byDayRaw, byTimeRaw] =
      await Promise.all([
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
      ]);

    const totalGuests = Number(totalsRaw?.guests ?? 0);
    const totalConversions = Number(totalsRaw?.conversions ?? 0);
    const totals = {
      houses: Number(totalsRaw?.houses ?? 0),
      adults: Number(totalsRaw?.adults ?? 0),
      kids: Number(totalsRaw?.kids ?? 0),
      guests: totalGuests,
      conversions: totalConversions,
      conversion_rate: totalGuests > 0 ? totalConversions / totalGuests : 0,
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
      year,
      months,
      range: {
        from: this.ymToPeriod(fromYm),
        to: this.ymToPeriod(toYm),
      },
      totals,
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
