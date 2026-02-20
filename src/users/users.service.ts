import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private toResponse(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? null,
      phone: user.phoneNumber ?? null,
      birth_date: user.birthDate
        ? new Date(user.birthDate).toISOString().split('T')[0]
        : null,
      life_group: user.lifeGroup ?? null,
      role: user.role?.slug ?? null,
      status: user.status,
      avatar: user.picture ?? null,
      membership_date: user.membershipDate
        ? new Date(user.membershipDate).toISOString().split('T')[0]
        : null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  async create(dto: CreateUserDto) {
    try {
      // Resolve role by slug or default to 'member'
      const roleSlug = dto.role ?? 'member';
      const role = await this.entityManager.findOne(Role, {
        where: { slug: roleSlug },
      });
      if (!role) {
        throw new BadRequestException(`Invalid role: ${roleSlug}`);
      }

      const user = new User();
      user.name = dto.name;
      user.email = dto.email;
      user.phoneNumber = dto.phone ?? null;
      user.birthDate = dto.birth_date ? new Date(dto.birth_date) : null;
      user.lifeGroup = dto.life_group ?? null;
      user.role = role;
      user.status = 'active';
      user.membershipDate = new Date();

      const saved = await this.entityManager.save(User, user);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while creating the user.',
      );
    }
  }

  async findAll() {
    try {
      const users = await this.entityManager.find(User, {
        order: { name: 'ASC' },
      });
      return users.map((u) => this.toResponse(u));
    } catch (error: unknown) {
      throw new BadRequestException(
        'An error occurred while retrieving users.',
      );
    }
  }

  async findOne(id: number) {
    const user = await this.entityManager.findOne(User, { where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toResponse(user);
  }

  async findOneEntity(id: number): Promise<User> {
    const user = await this.entityManager.findOne(User, { where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    try {
      const user = await this.findOneEntity(id);

      if (dto.name !== undefined) user.name = dto.name;
      if (dto.email !== undefined) user.email = dto.email;
      if (dto.phone !== undefined) user.phoneNumber = dto.phone ?? null;
      if (dto.birth_date !== undefined)
        user.birthDate = dto.birth_date ? new Date(dto.birth_date) : null;
      if (dto.life_group !== undefined) user.lifeGroup = dto.life_group || null;
      if (dto.role !== undefined) {
        const role = await this.entityManager.findOne(Role, {
          where: { slug: dto.role },
        });
        if (!role) {
          throw new BadRequestException(`Invalid role: ${dto.role}`);
        }
        user.role = role;
      }
      if (dto.status !== undefined) user.status = dto.status;
      if (dto.avatar !== undefined) user.picture = dto.avatar;

      const saved = await this.entityManager.save(User, user);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the user.',
      );
    }
  }

  async updateRole(id: number, dto: UpdateUserRoleDto) {
    try {
      const user = await this.findOneEntity(id);
      const role = await this.entityManager.findOne(Role, {
        where: { slug: dto.role },
      });
      if (!role) {
        throw new BadRequestException(`Invalid role: ${dto.role}`);
      }
      user.role = role;
      const saved = await this.entityManager.save(User, user);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the user role.',
      );
    }
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOneEntity(id);
    await this.entityManager.remove(User, user);
  }
}
