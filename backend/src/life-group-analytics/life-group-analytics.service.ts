import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LifeGroupAttendance } from '../life-group-attendance/entities/life-group-attendance.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { DistributionQueryDto } from './dto/distribution-query.dto';
import { WEEKDAY_INDEX } from '../life-group-attendance/meeting-day.util';

const NEIGHBORHOOD_TOP_N = 10;
const OTHERS_LABEL = 'Outros';

interface Actor {
  id: number;
}

export interface MonthlyBucket {
  period: string;
  meetings_count: number;
  present_count: number;
  members_count: number;
  attendance_rate: number;
}

@Injectable()
export class LifeGroupAnalyticsService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  /**
   * Resolves the set of life_group_ids this request is allowed to see,
   * intersected with an optional explicit `life_group_id` filter. Returns
   * `null` when the caller is unrestricted (no IN (...) filter needed) and
   * `[]` when the caller has access to nothing — callers MUST check for the
   * empty-array case before building an `IN (...)` clause, since an empty
   * `IN ()` is invalid SQL and TypeORM's naive interpolation of an empty
   * array here would either error or (worse) silently match everything.
   */
  private async resolveLifeGroupIds(
    scope: ResolvedScope,
    actor: Actor,
    lifeGroupIdFilter?: number,
  ): Promise<number[] | null> {
    // A co-leader may have no leadership role slug at all (see comment
    // block in life-group-attendance.controller.ts), so scope alone won't
    // grant them access — extend scope with any life groups where the
    // actor is the leader or co-leader, mirroring
    // LifeGroupAttendanceService.assertCanAccess.
    const ledGroupIds = scope.unrestricted
      ? []
      : (
          await this.em
            .createQueryBuilder(LifeGroup, 'lg')
            .select('lg.id', 'id')
            .where('lg.leader_id = :actorId OR lg.co_leader_id = :actorId', {
              actorId: actor.id,
            })
            .getRawMany<{ id: number }>()
        ).map((r) => Number(r.id));

    if (lifeGroupIdFilter !== undefined) {
      if (
        !scope.unrestricted &&
        !scope.lifeGroupIds.includes(lifeGroupIdFilter) &&
        !ledGroupIds.includes(lifeGroupIdFilter)
      ) {
        throw new ForbiddenException(
          'You do not have access to this life group.',
        );
      }
      return [lifeGroupIdFilter];
    }
    if (scope.unrestricted) return null;
    return Array.from(new Set([...scope.lifeGroupIds, ...ledGroupIds]));
  }

  /**
   * The set of life groups (id/name) this actor can see analytics for —
   * every group when unrestricted (admin/pastor), or exactly the groups
   * resolveLifeGroupIds would scope queries to otherwise. Backs the mobile
   * analytics screen's group filter so it never offers a group the actor
   * has no visibility into, and never limits an area/sector leader or
   * admin/pastor to only the group(s) they personally lead.
   */
  async scope(scope: ResolvedScope, actor: Actor) {
    const lifeGroupIds = await this.resolveLifeGroupIds(scope, actor);
    const qb = this.em
      .createQueryBuilder(LifeGroup, 'lg')
      .select('lg.id', 'id')
      .addSelect('lg.name', 'name')
      .orderBy('lg.name', 'ASC');
    if (lifeGroupIds !== null) {
      if (lifeGroupIds.length === 0) {
        return { unrestricted: false, life_groups: [] };
      }
      qb.where('lg.id IN (:...lifeGroupIds)', { lifeGroupIds });
    }
    const rows = await qb.getRawMany<{ id: number; name: string }>();
    return {
      unrestricted: lifeGroupIds === null,
      life_groups: rows.map((r) => ({ id: r.id, name: r.name })),
    };
  }

  async attendance(query: AttendanceQueryDto, scope: ResolvedScope, actor: Actor) {
    const lifeGroupIds = await this.resolveLifeGroupIds(
      scope,
      actor,
      query.life_group_id,
    );
    if (lifeGroupIds !== null && lifeGroupIds.length === 0) {
      return {
        granularity: query.granularity ?? 'month',
        year: query.year ?? new Date().getFullYear(),
        rows: [],
      };
    }

    const year = query.year ?? new Date().getFullYear();
    const granularity = query.granularity ?? 'month';

    if (granularity === 'meeting') {
      if (!query.month) {
        throw new BadRequestException(
          'month is required when granularity=meeting.',
        );
      }
      const rows = await this.attendanceByMeeting(
        year,
        query.month,
        lifeGroupIds,
      );
      return { granularity, year, month: query.month, rows };
    }

    const rows = await this.attendanceByMonth(year, lifeGroupIds);
    return { granularity, year, rows };
  }

  private async attendanceByMonth(
    year: number,
    lifeGroupIds: number[] | null,
  ): Promise<MonthlyBucket[]> {
    const qb = this.em
      .createQueryBuilder(LifeGroupAttendance, 'a')
      .select("to_char(a.meeting_date, 'YYYY-MM')", 'period')
      .addSelect('COUNT(*)', 'meetings_count')
      .addSelect('COALESCE(SUM(a.present_count), 0)', 'present_count')
      .addSelect('COALESCE(SUM(a.members_count), 0)', 'members_count')
      .where('EXTRACT(YEAR FROM a.meeting_date) = :year', { year })
      .groupBy("to_char(a.meeting_date, 'YYYY-MM')")
      .orderBy("to_char(a.meeting_date, 'YYYY-MM')", 'ASC');

    if (lifeGroupIds !== null) {
      qb.andWhere('a.life_group_id IN (:...lifeGroupIds)', { lifeGroupIds });
    }

    const raw = await qb.getRawMany<{
      period: string;
      meetings_count: string;
      present_count: string;
      members_count: string;
    }>();

    const byPeriod = new Map(
      raw.map((r) => [
        r.period,
        {
          period: r.period,
          meetings_count: Number(r.meetings_count),
          present_count: Number(r.present_count),
          members_count: Number(r.members_count),
          attendance_rate:
            Number(r.members_count) > 0
              ? Number(r.present_count) / Number(r.members_count)
              : 0,
        },
      ]),
    );

    // Always return all 12 months of the year, zero-filled, so the chart's
    // x-axis is stable regardless of which months actually had meetings.
    const result: MonthlyBucket[] = [];
    for (let m = 1; m <= 12; m += 1) {
      const period = `${year}-${String(m).padStart(2, '0')}`;
      result.push(
        byPeriod.get(period) ?? {
          period,
          meetings_count: 0,
          present_count: 0,
          members_count: 0,
          attendance_rate: 0,
        },
      );
    }
    return result;
  }

  private async attendanceByMeeting(
    year: number,
    month: number,
    lifeGroupIds: number[] | null,
  ) {
    // getRawMany() bypasses TypeORM's entity hydration, so pg's own date
    // type parser would return a JS Date for a raw `date` column (which then
    // serializes to a full ISO timestamp and can roll back a calendar day
    // depending on server timezone). Cast to text via to_char so we always
    // get back a plain YYYY-MM-DD string, mirroring attendanceByMonth above.
    const qb = this.em
      .createQueryBuilder(LifeGroupAttendance, 'a')
      .select("to_char(a.meeting_date, 'YYYY-MM-DD')", 'meeting_date')
      .addSelect('COALESCE(SUM(a.present_count), 0)', 'present_count')
      .addSelect('COALESCE(SUM(a.members_count), 0)', 'members_count')
      .where('EXTRACT(YEAR FROM a.meeting_date) = :year', { year })
      .andWhere('EXTRACT(MONTH FROM a.meeting_date) = :month', { month })
      .groupBy('a.meeting_date')
      .orderBy('a.meeting_date', 'ASC');

    if (lifeGroupIds !== null) {
      qb.andWhere('a.life_group_id IN (:...lifeGroupIds)', { lifeGroupIds });
    }

    const raw = await qb.getRawMany<{
      meeting_date: string;
      present_count: string;
      members_count: string;
    }>();

    return raw.map((r) => ({
      period: r.meeting_date,
      meetings_count: 1,
      present_count: Number(r.present_count),
      members_count: Number(r.members_count),
      attendance_rate:
        Number(r.members_count) > 0
          ? Number(r.present_count) / Number(r.members_count)
          : 0,
    }));
  }

  async distribution(
    query: DistributionQueryDto,
    scope: ResolvedScope,
    actor: Actor,
  ) {
    const lifeGroupIds = await this.resolveLifeGroupIds(
      scope,
      actor,
      query.life_group_id,
    );
    if (lifeGroupIds !== null && lifeGroupIds.length === 0) {
      return { by_day: [], by_hour: [], by_neighborhood: [], by_city: [] };
    }

    const baseQb = () => {
      const qb = this.em.createQueryBuilder(LifeGroup, 'lg');
      if (lifeGroupIds !== null) {
        qb.where('lg.id IN (:...lifeGroupIds)', { lifeGroupIds });
      }
      return qb;
    };

    const [byDayRaw, byHourRaw, byNeighborhoodRaw, byCityRaw] =
      await Promise.all([
        baseQb()
          .select('lg.meeting_day', 'meeting_day')
          .addSelect('COUNT(*)', 'count')
          .andWhere('lg.meeting_day IS NOT NULL')
          .groupBy('lg.meeting_day')
          .getRawMany<{ meeting_day: string; count: string }>(),
        baseQb()
          .select('EXTRACT(HOUR FROM lg.meeting_time)', 'hour')
          .addSelect('COUNT(*)', 'count')
          .andWhere('lg.meeting_time IS NOT NULL')
          .groupBy('EXTRACT(HOUR FROM lg.meeting_time)')
          .orderBy('EXTRACT(HOUR FROM lg.meeting_time)', 'ASC')
          .getRawMany<{ hour: string; count: string }>(),
        baseQb()
          .select('lg.neighborhood', 'neighborhood')
          .addSelect('COUNT(*)', 'count')
          .andWhere('lg.neighborhood IS NOT NULL')
          .groupBy('lg.neighborhood')
          .orderBy('count', 'DESC')
          .getRawMany<{ neighborhood: string; count: string }>(),
        baseQb()
          .select('lg.city', 'city')
          .addSelect('COUNT(*)', 'count')
          .andWhere('lg.city IS NOT NULL')
          .groupBy('lg.city')
          .orderBy('count', 'DESC')
          .getRawMany<{ city: string; count: string }>(),
      ]);

    const byDay = [...byDayRaw]
      .sort(
        (a, b) =>
          (WEEKDAY_INDEX[a.meeting_day] ?? 99) -
          (WEEKDAY_INDEX[b.meeting_day] ?? 99),
      )
      .map((r) => ({ label: r.meeting_day, count: Number(r.count) }));

    const byHour = byHourRaw.map((r) => ({
      label: `${String(Number(r.hour)).padStart(2, '0')}:00`,
      count: Number(r.count),
    }));

    const byNeighborhood = this.bucketTopN(
      byNeighborhoodRaw.map((r) => ({
        label: r.neighborhood,
        count: Number(r.count),
      })),
    );

    const byCity = this.bucketTopN(
      byCityRaw.map((r) => ({ label: r.city, count: Number(r.count) })),
    );

    return {
      by_day: byDay,
      by_hour: byHour,
      by_neighborhood: byNeighborhood,
      by_city: byCity,
    };
  }

  private bucketTopN(
    rows: { label: string; count: number }[],
  ): { label: string; count: number }[] {
    if (rows.length <= NEIGHBORHOOD_TOP_N) return rows;
    const top = rows.slice(0, NEIGHBORHOOD_TOP_N);
    const othersCount = rows
      .slice(NEIGHBORHOOD_TOP_N)
      .reduce((sum, r) => sum + r.count, 0);
    return [...top, { label: OTHERS_LABEL, count: othersCount }];
  }
}
