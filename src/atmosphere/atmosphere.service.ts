import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AtmosphereMinistry } from './entities/atmosphere-ministry.entity';
import { AtmosphereTeam } from './entities/atmosphere-team.entity';
import { CreateAtmosphereMinistryDto } from './dto/create-atmosphere-ministry.dto';
import { UpdateAtmosphereMinistryDto } from './dto/update-atmosphere-ministry.dto';
import { CreateAtmosphereTeamDto } from './dto/create-atmosphere-team.dto';
import { UpdateAtmosphereTeamDto } from './dto/update-atmosphere-team.dto';

@Injectable()
export class AtmosphereService {
  constructor(
    @InjectRepository(AtmosphereMinistry) private readonly ministryRepo: Repository<AtmosphereMinistry>,
    @InjectRepository(AtmosphereTeam) private readonly teamRepo: Repository<AtmosphereTeam>,
  ) {}

  findAllMinistries() {
    return this.ministryRepo.find({
      relations: ['leader', 'members', 'teams', 'teams.leader', 'teams.members'],
      order: { name: 'ASC' },
    });
  }

  async createMinistry(dto: CreateAtmosphereMinistryDto) {
    return this.ministryRepo.save(this.ministryRepo.create({
      name: dto.name,
      leader: dto.leaderId ? { id: dto.leaderId } as any : null,
    }));
  }

  async updateMinistry(id: number, dto: UpdateAtmosphereMinistryDto) {
    const m = await this.ministryRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException();
    if (dto.name !== undefined) m.name = dto.name;
    if (dto.leaderId !== undefined) m.leader = dto.leaderId ? { id: dto.leaderId } as any : null;
    return this.ministryRepo.save(m);
  }

  async deleteMinistry(id: number) {
    await this.ministryRepo.delete(id);
  }

  findAllTeams(ministryId?: number) {
    const where = ministryId ? { ministryId } : {};
    return this.teamRepo.find({ where, relations: ['leader', 'ministry'], order: { name: 'ASC' } });
  }

  async createTeam(dto: CreateAtmosphereTeamDto) {
    return this.teamRepo.save(this.teamRepo.create({
      name: dto.name,
      ministry: { id: dto.ministryId } as any,
      ministryId: dto.ministryId,
      leader: dto.leaderId ? { id: dto.leaderId } as any : null,
    }));
  }

  async updateTeam(id: number, dto: UpdateAtmosphereTeamDto) {
    const t = await this.teamRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException();
    if (dto.name !== undefined) t.name = dto.name;
    if (dto.ministryId !== undefined) t.ministryId = dto.ministryId;
    if (dto.leaderId !== undefined) t.leader = dto.leaderId ? { id: dto.leaderId } as any : null;
    return this.teamRepo.save(t);
  }

  async deleteTeam(id: number) {
    await this.teamRepo.delete(id);
  }

  async addMinistryMember(ministryId: number, userId: number) {
    const m = await this.ministryRepo.findOne({ where: { id: ministryId }, relations: ['members'] });
    if (!m) throw new NotFoundException();
    const alreadyMember = m.members.some((u) => u.id === userId);
    if (!alreadyMember) {
      m.members = [...m.members, { id: userId } as any];
      await this.ministryRepo.save(m);
    }
    return this.ministryRepo.findOne({ where: { id: ministryId }, relations: ['leader', 'members', 'teams', 'teams.leader'] });
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
    const alreadyMember = t.members.some((u) => u.id === userId);
    if (!alreadyMember) {
      t.members = [...t.members, { id: userId } as any];
      await this.teamRepo.save(t);
    }
    return this.teamRepo.findOne({ where: { id: teamId }, relations: ['leader', 'members', 'ministry'] });
  }

  async removeTeamMember(teamId: number, userId: number) {
    const t = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['members'] });
    if (!t) throw new NotFoundException();
    t.members = t.members.filter((u) => u.id !== userId);
    await this.teamRepo.save(t);
  }
}
