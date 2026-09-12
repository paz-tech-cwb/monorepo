import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    // resolver. Scope is now derived from whether the user is the
    // `leader_id` OR `co_leader_id` on an Area/Sector/LifeGroup row, so that
    // co-leaders get the same scope as leaders. The legacy columns are kept
    // in the schema but are no longer read here.

    if (slug === 'area_leader') {
      const area = await this.areas.findOne({
        where: [{ leader: { id: userId } }, { coLeader: { id: userId } }],
      });
      if (area) {
        const sectorsInArea = await this.sectors.find({
          where: { area: { id: area.id } },
        });
        const sectorIds = sectorsInArea.map((s) => s.id);
        const lifes = sectorIds.length
          ? await this.lifeGroups
              .createQueryBuilder('lg')
              .innerJoin('lg.sector', 'sector')
              .where('sector.id IN (:...sectorIds)', { sectorIds })
              .getMany()
          : [];
        return {
          unrestricted: false,
          areaIds: [area.id],
          sectorIds,
          lifeGroupIds: lifes.map((l) => l.id),
        };
      }
    }

    if (slug === 'sector_leader') {
      const sector = await this.sectors.findOne({
        where: [{ leader: { id: userId } }, { coLeader: { id: userId } }],
      });
      if (sector) {
        const lifes = await this.lifeGroups.find({
          where: { sector: { id: sector.id } },
        });
        return {
          unrestricted: false,
          areaIds: [],
          sectorIds: [sector.id],
          lifeGroupIds: lifes.map((l) => l.id),
        };
      }
    }

    if (slug === 'life_group_leader') {
      const lifeGroup = await this.lifeGroups.findOne({
        where: [{ leader: { id: userId } }, { coLeader: { id: userId } }],
      });
      if (lifeGroup) {
        return {
          unrestricted: false,
          areaIds: [],
          sectorIds: [],
          lifeGroupIds: [lifeGroup.id],
        };
      }
    }

    return {
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [],
    };
  }
}
