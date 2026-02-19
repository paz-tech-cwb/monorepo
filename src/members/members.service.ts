import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Member } from './entities/member.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(member: Member) {
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone ?? null,
      address: member.address ?? null,
      birth_date: member.birthDate
        ? member.birthDate.toISOString().split('T')[0]
        : null,
      life_group: member.lifeGroup ?? null,
      status: member.status,
      membership_date: member.membershipDate
        ? member.membershipDate.toISOString().split('T')[0]
        : null,
      created_at: member.createdAt,
      updated_at: member.updatedAt,
    };
  }

  async create(dto: CreateMemberDto) {
    try {
      const member = this.entityManager.create(Member, {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        birthDate: dto.birth_date ? new Date(dto.birth_date) : null,
        lifeGroup:
          dto.life_group && dto.life_group.trim() !== ''
            ? dto.life_group
            : null,
        status: dto.status ?? 'active',
        membershipDate: new Date(),
      });
      const saved = await this.entityManager.save(member);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique')) {
        throw new BadRequestException(
          'A member with this email already exists.',
        );
      }
      throw new BadRequestException(
        'An error occurred while creating the member.',
      );
    }
  }

  async findAll() {
    try {
      const members = await this.entityManager.find(Member, {
        order: { name: 'ASC' },
      });
      return members.map((m) => this.toResponse(m));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving members.',
      );
    }
  }

  async findOne(id: number) {
    const member = await this.entityManager.findOne(Member, { where: { id } });
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }
    return this.toResponse(member);
  }

  async findOneEntity(id: number): Promise<Member> {
    const member = await this.entityManager.findOne(Member, { where: { id } });
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }
    return member;
  }

  async update(id: number, dto: UpdateMemberDto) {
    try {
      const member = await this.findOneEntity(id);

      if (dto.name !== undefined) member.name = dto.name;
      if (dto.email !== undefined) member.email = dto.email;
      if (dto.phone !== undefined) member.phone = dto.phone || null;
      if (dto.address !== undefined) member.address = dto.address || null;
      if (dto.birth_date !== undefined)
        member.birthDate = dto.birth_date ? new Date(dto.birth_date) : null;
      if (dto.life_group !== undefined)
        member.lifeGroup =
          dto.life_group && dto.life_group.trim() !== ''
            ? dto.life_group
            : null;
      if (dto.status !== undefined) member.status = dto.status;

      const saved = await this.entityManager.save(Member, member);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the member.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const member = await this.findOneEntity(id);
    await this.entityManager.remove(Member, member);
  }
}
