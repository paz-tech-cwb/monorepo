import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';

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
    @InjectRepository(LifeGroup) private readonly lifeGroups: Repository<LifeGroup>,
  ) {}

  async resolve(userId: number): Promise<ResolvedScope> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: ['role', 'leadingArea', 'leadingSector', 'leadingLifeGroup'],
    });
    if (!user) throw new Error(`User ${userId} not found`);

    const slug = user.role?.slug;
    if (slug === 'admin' || slug === 'pastor') {
      return { unrestricted: true, areaIds: [], sectorIds: [], lifeGroupIds: [] };
    }

    if (slug === 'area_leader' && user.leadingArea) {
      const lifes = await this.lifeGroups
        .createQueryBuilder('lg')
        .innerJoinAndSelect('lg.sector', 'sector')
        .where('sector.area_id = :areaId', { areaId: user.leadingArea.id })
        .getMany();
      const sectorIds = [...new Set(lifes.map((l) => l.sector!.id))];
      return {
        unrestricted: false,
        areaIds: [user.leadingArea.id],
        sectorIds,
        lifeGroupIds: lifes.map((l) => l.id),
      };
    }

    if (slug === 'sector_leader' && user.leadingSector) {
      const lifes = await this.lifeGroups.find({
        where: { sector: { id: user.leadingSector.id } },
      });
      return {
        unrestricted: false,
        areaIds: [],
        sectorIds: [user.leadingSector.id],
        lifeGroupIds: lifes.map((l) => l.id),
      };
    }

    if (slug === 'life_group_leader' && user.leadingLifeGroup) {
      return {
        unrestricted: false,
        areaIds: [],
        sectorIds: [],
        lifeGroupIds: [user.leadingLifeGroup.id],
      };
    }

    return { unrestricted: false, areaIds: [], sectorIds: [], lifeGroupIds: [] };
  }
}
