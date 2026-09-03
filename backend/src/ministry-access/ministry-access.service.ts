import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';

export interface MinistryAccessResult {
  isLeader: boolean;
  isMember: boolean;
}

@Injectable()
export class MinistryAccessService {
  constructor(
    @InjectRepository(Ministry)
    private readonly ministryRepo: Repository<Ministry>,
    @InjectRepository(MinistryTeam)
    private readonly teamRepo: Repository<MinistryTeam>,
  ) {}

  async resolve(
    userId: number,
    ministrySlug: string,
  ): Promise<MinistryAccessResult> {
    const ministry = await this.ministryRepo.findOne({
      where: { slug: ministrySlug },
      relations: ['leader', 'coLeader', 'members'],
    });
    if (!ministry) {
      return { isLeader: false, isMember: false };
    }

    const teams = await this.teamRepo.find({
      where: { ministry: { id: ministry.id } },
      relations: ['leader', 'coLeader', 'members'],
    });

    const isLeader =
      ministry.leader?.id === userId ||
      ministry.coLeader?.id === userId ||
      teams.some((t) => t.leader?.id === userId || t.coLeader?.id === userId);

    const isMember =
      ministry.members.some((m) => m.id === userId) ||
      teams.some((t) => t.members.some((m) => m.id === userId));

    return { isLeader, isMember };
  }
}
