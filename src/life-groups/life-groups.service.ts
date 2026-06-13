import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LifeGroup } from './entities/life-group.entity';
import { CreateLifeGroupDto } from './dto/create-life-group.dto';
import { UpdateLifeGroupDto } from './dto/update-life-group.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class LifeGroupsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(lifeGroup: LifeGroup) {
    return {
      id: lifeGroup.id,
      name: lifeGroup.name,
      leader_id: lifeGroup.leader?.id ?? null,
      leader_name: lifeGroup.leader?.name ?? null,
      co_leader_id: lifeGroup.coLeader?.id ?? null,
      co_leader_name: lifeGroup.coLeader?.name ?? null,
      sector_id: lifeGroup.sector?.id ?? null,
      location: lifeGroup.location ?? null,
      meeting_day: lifeGroup.meetingDay ?? null,
      meeting_time: lifeGroup.meetingTime ?? null,
      member_count: lifeGroup.users?.length ?? 0,
      members:
        lifeGroup.users?.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email ?? '',
        })) ?? [],
      created_at: lifeGroup.createdAt,
      updated_at: lifeGroup.updatedAt,
    };
  }

  async create(dto: CreateLifeGroupDto) {
    try {
      const lifeGroup = this.entityManager.create(LifeGroup, {
        name: dto.name,
        leader: dto.leader_id ? { id: dto.leader_id } : null,
        coLeader: dto.co_leader_id ? ({ id: dto.co_leader_id } as any) : null,
        sector: dto.sector_id ? { id: dto.sector_id } : null,
        location: dto.location ?? null,
        meetingDay: dto.meeting_day ?? null,
        meetingTime: dto.meeting_time ?? null,
      });
      const saved = await this.entityManager.save(lifeGroup);
      const loaded = await this.entityManager.findOne(LifeGroup, {
        where: { id: saved.id },
        relations: ['leader', 'coLeader', 'sector', 'users'],
      });
      return this.toResponse(loaded!);
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while creating the life group.',
      );
    }
  }

  async findAll() {
    try {
      const lifeGroups = await this.entityManager.find(LifeGroup, {
        relations: ['leader', 'coLeader', 'sector', 'users'],
        order: { name: 'ASC' },
      });
      return lifeGroups.map((lg) => this.toResponse(lg));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving life groups.',
      );
    }
  }

  async findOne(id: number) {
    const lifeGroup = await this.entityManager.findOne(LifeGroup, {
      where: { id },
      relations: ['leader', 'coLeader', 'sector', 'users'],
    });
    if (!lifeGroup) {
      throw new NotFoundException(`Life group with ID ${id} not found`);
    }
    return this.toResponse(lifeGroup);
  }

  async findOneEntity(id: number): Promise<LifeGroup> {
    const lifeGroup = await this.entityManager.findOne(LifeGroup, {
      where: { id },
      relations: ['leader', 'coLeader', 'sector', 'users'],
    });
    if (!lifeGroup) {
      throw new NotFoundException(`Life group with ID ${id} not found`);
    }
    return lifeGroup;
  }

  async update(id: number, dto: UpdateLifeGroupDto) {
    try {
      const lifeGroup = await this.findOneEntity(id);

      if (dto.name !== undefined) lifeGroup.name = dto.name;
      if (dto.leader_id !== undefined)
        lifeGroup.leader = dto.leader_id
          ? ({ id: dto.leader_id } as any)
          : null;
      if (dto.co_leader_id !== undefined)
        lifeGroup.coLeader = dto.co_leader_id
          ? ({ id: dto.co_leader_id } as any)
          : null;
      if (dto.sector_id !== undefined)
        lifeGroup.sector = dto.sector_id
          ? ({ id: dto.sector_id } as any)
          : null;
      if (dto.location !== undefined) lifeGroup.location = dto.location;
      if (dto.meeting_day !== undefined) lifeGroup.meetingDay = dto.meeting_day;
      if (dto.meeting_time !== undefined)
        lifeGroup.meetingTime = dto.meeting_time;

      const saved = await this.entityManager.save(LifeGroup, lifeGroup);
      const loaded = await this.entityManager.findOne(LifeGroup, {
        where: { id: saved.id },
        relations: ['leader', 'coLeader', 'sector', 'users'],
      });
      return this.toResponse(loaded!);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the life group.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const lifeGroup = await this.findOneEntity(id);
    await this.entityManager.remove(LifeGroup, lifeGroup);
  }

  async addMember(lifeGroupId: number, userId: number): Promise<void> {
    const lifeGroup = await this.findOneEntity(lifeGroupId);
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      relations: ['lifeGroups'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const alreadyMember = user.lifeGroups.some((lg) => lg.id === lifeGroupId);
    // Idempotent: no-op if user is already a member
    if (!alreadyMember) {
      user.lifeGroups.push(lifeGroup);
      await this.entityManager.save(User, user);
    }
  }

  async removeMember(lifeGroupId: number, userId: number): Promise<void> {
    await this.findOneEntity(lifeGroupId); // throws NotFoundException if group not found
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      relations: ['lifeGroups'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // Idempotent: no-op if user is not a member
    const lengthBefore = user.lifeGroups.length;
    user.lifeGroups = user.lifeGroups.filter((lg) => lg.id !== lifeGroupId);
    if (user.lifeGroups.length < lengthBefore) {
      await this.entityManager.save(User, user);
    }
  }
}
