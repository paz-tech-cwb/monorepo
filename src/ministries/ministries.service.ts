import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from './entities/ministry.entity';
import { MinistryTeam } from './entities/ministry-team.entity';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { CreateMinistryTeamDto } from './dto/create-ministry-team.dto';
import { UpdateMinistryTeamDto } from './dto/update-ministry-team.dto';

const MINISTRY_RELATIONS = [
  'leader', 'coLeader', 'members',
  'teams', 'teams.leader', 'teams.coLeader', 'teams.members',
];

@Injectable()
export class MinistriesService {
  constructor(
    @InjectRepository(Ministry) private readonly ministryRepo: Repository<Ministry>,
    @InjectRepository(MinistryTeam) private readonly teamRepo: Repository<MinistryTeam>,
  ) {}

  private ref(id?: number) {
    return id ? ({ id } as any) : null;
  }

  findAllMinistries() {
    return this.ministryRepo.find({ relations: MINISTRY_RELATIONS, order: { name: 'ASC' } });
  }

  findMinistry(id: number) {
    return this.ministryRepo.findOne({ where: { id }, relations: MINISTRY_RELATIONS });
  }

  async createMinistry(dto: CreateMinistryDto) {
    return this.ministryRepo.save(this.ministryRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      membershipMode: dto.membershipMode ?? 'teams',
      leader: this.ref(dto.leaderId),
      coLeader: this.ref(dto.coLeaderId),
    }));
  }

  async updateMinistry(id: number, dto: UpdateMinistryDto) {
    const m = await this.ministryRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException();
    if (dto.name !== undefined) m.name = dto.name;
    if (dto.description !== undefined) m.description = dto.description ?? null;
    if (dto.membershipMode !== undefined) m.membershipMode = dto.membershipMode;
    if (dto.leaderId !== undefined) m.leader = this.ref(dto.leaderId);
    if (dto.coLeaderId !== undefined) m.coLeader = this.ref(dto.coLeaderId);
    return this.ministryRepo.save(m);
  }

  async deleteMinistry(id: number) {
    await this.ministryRepo.delete(id);
  }

  findAllTeams(ministryId?: number) {
    const where = ministryId ? { ministryId } : {};
    return this.teamRepo.find({
      where, relations: ['leader', 'coLeader', 'members', 'ministry'], order: { name: 'ASC' },
    });
  }

  async createTeam(dto: CreateMinistryTeamDto) {
    const ministry = await this.ministryRepo.findOne({ where: { id: dto.ministryId } });
    if (!ministry) throw new NotFoundException('Ministry not found');
    if (ministry.membershipMode !== 'teams') {
      throw new BadRequestException('Ministry is in direct-members mode; teams are not allowed');
    }
    return this.teamRepo.save(this.teamRepo.create({
      name: dto.name,
      ministry: this.ref(dto.ministryId),
      ministryId: dto.ministryId,
      leader: this.ref(dto.leaderId),
      coLeader: this.ref(dto.coLeaderId),
    }));
  }

  async updateTeam(id: number, dto: UpdateMinistryTeamDto) {
    const t = await this.teamRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException();
    if (dto.name !== undefined) t.name = dto.name;
    if (dto.ministryId !== undefined) t.ministryId = dto.ministryId;
    if (dto.leaderId !== undefined) t.leader = this.ref(dto.leaderId);
    if (dto.coLeaderId !== undefined) t.coLeader = this.ref(dto.coLeaderId);
    return this.teamRepo.save(t);
  }

  async deleteTeam(id: number) {
    await this.teamRepo.delete(id);
  }

  async addMinistryMember(ministryId: number, userId: number) {
    const m = await this.ministryRepo.findOne({ where: { id: ministryId }, relations: ['members'] });
    if (!m) throw new NotFoundException();
    if (m.membershipMode !== 'direct') {
      throw new BadRequestException('Ministry is in teams mode; add members to a team instead');
    }
    if (!m.members.some((u) => u.id === userId)) {
      m.members = [...m.members, this.ref(userId)];
      await this.ministryRepo.save(m);
    }
    return this.findMinistry(ministryId);
  }

  async removeMinistryMember(ministryId: number, userId: number) {
    const m = await this.ministryRepo.findOne({ where: { id: ministryId }, relations: ['members'] });
    if (!m) throw new NotFoundException();
    m.members = m.members.filter((u) => u.id !== userId);
    await this.ministryRepo.save(m);
  }

  async addTeamMember(teamId: number, userId: number) {
    const t = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['members'] });
    if (!t) throw new NotFoundException();
    if (!t.members.some((u) => u.id === userId)) {
      t.members = [...t.members, this.ref(userId)];
      await this.teamRepo.save(t);
    }
    return this.teamRepo.findOne({
      where: { id: teamId }, relations: ['leader', 'coLeader', 'members', 'ministry'],
    });
  }

  async removeTeamMember(teamId: number, userId: number) {
    const t = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['members'] });
    if (!t) throw new NotFoundException();
    t.members = t.members.filter((u) => u.id !== userId);
    await this.teamRepo.save(t);
  }
}
