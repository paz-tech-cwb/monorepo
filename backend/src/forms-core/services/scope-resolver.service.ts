import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface ResolvedScope {
  unrestricted: boolean;
  areaIds: number[];
  sectorIds: number[];
  lifeGroupIds: number[];
}

@Injectable()
export class ScopeResolverService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async resolve(userId: number): Promise<ResolvedScope> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: ['role'],
      select: { id: true, role: { id: true, slug: true } },
    });
    if (!user) throw new Error(`User ${userId} not found`);

    const slug = user.role?.slug;
    if (slug === 'admin' || slug === 'pastor') {
      return {
        unrestricted: true,
        areaIds: [],
        sectorIds: [],
        lifeGroupIds: [],
      };
    }

    // NOTE: `users.leading_area_id` / `leading_sector_id` /
    // `leading_life_group_id` (see User entity's `leadingArea` /
    // `leadingSector` / `leadingLifeGroup` relations) are superseded by this
    // resolver. Scope is derived from the rows the user actually is the
    // `leader_id` OR `co_leader_id` of (Area / Sector / LifeGroup), NOT from
    // the role slug: roles are assigned manually and are not synced when a
    // leader is set on a row, and a user may lead several rows (or rows of
    // different levels). Everything found is unioned. Endpoint-level `@Roles`
    // guards still gate by slug, and a user who leads nothing gets an empty
    // scope, so this never grants access to a plain member.
    // One round trip, ids only (no entity hydration). Areas the user leads
    // -> their sectors; plus directly led sectors; groups = every group of
    // those sectors plus directly led groups.
    const rows: Array<{ kind: string; id: number }> = await this.users.query(
      `
      WITH led_areas AS (
        SELECT a.id FROM areas a
        WHERE a.leader_id = $1 OR a.co_leader_id = $1
      ),
      led_sectors AS (
        SELECT s.id FROM sectors s
        WHERE s.leader_id = $1 OR s.co_leader_id = $1
           OR s.area_id IN (SELECT id FROM led_areas)
      ),
      led_groups AS (
        SELECT lg.id FROM life_groups lg
        WHERE lg.leader_id = $1 OR lg.co_leader_id = $1
           OR lg."sectorId" IN (SELECT id FROM led_sectors)
      )
      SELECT 'area' AS kind, id FROM led_areas
      UNION SELECT 'sector', id FROM led_sectors
      UNION SELECT 'group', id FROM led_groups
      `,
      [userId],
    );

    const idsOf = (kind: string) =>
      unique(rows.filter((r) => r.kind === kind).map((r) => Number(r.id)));

    return {
      unrestricted: false,
      areaIds: idsOf('area'),
      sectorIds: idsOf('sector'),
      lifeGroupIds: idsOf('group'),
    };
  }
}

function unique(ids: number[]): number[] {
  return Array.from(new Set(ids));
}
