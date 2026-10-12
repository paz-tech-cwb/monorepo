import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { Area } from '../../areas/entities/area.entity';
import { Sector } from '../../sectors/entities/sector.entity';

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
    @InjectRepository(LifeGroup)
    private readonly lifeGroups: Repository<LifeGroup>,
    @InjectRepository(Area)
    private readonly areas: Repository<Area>,
    @InjectRepository(Sector)
    private readonly sectors: Repository<Sector>,
  ) {}

  async resolve(userId: number): Promise<ResolvedScope> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: ['role'],
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
    const leaderOf = [{ leader: { id: userId } }, { coLeader: { id: userId } }];

    const [ledAreas, ledSectors, ledGroups] = await Promise.all([
      this.areas.find({ where: leaderOf }),
      this.sectors.find({ where: leaderOf }),
      this.lifeGroups.find({ where: leaderOf }),
    ]);

    const areaIds = ledAreas.map((a) => a.id);

    const sectorsInAreas = areaIds.length
      ? await this.sectors.find({ where: { area: { id: In(areaIds) } } })
      : [];
    const sectorIds = unique([
      ...sectorsInAreas.map((s) => s.id),
      ...ledSectors.map((s) => s.id),
    ]);

    const groupsInSectors = sectorIds.length
      ? await this.lifeGroups.find({
          where: { sector: { id: In(sectorIds) } },
        })
      : [];
    const lifeGroupIds = unique([
      ...groupsInSectors.map((l) => l.id),
      ...ledGroups.map((l) => l.id),
    ]);

    return { unrestricted: false, areaIds, sectorIds, lifeGroupIds };
  }
}

function unique(ids: number[]): number[] {
  return Array.from(new Set(ids));
}
