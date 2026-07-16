import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Sector } from '../sectors/entities/sector.entity';
import { Course } from '../courses/entities/course.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Address } from '../addresses/entities/address.entity';

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
      sector_id: user.sector?.id ?? null,
      sector: user.sector
        ? {
            id: user.sector.id,
            name: user.sector.name,
          }
        : null,
      life_group_ids: user.lifeGroups?.map((lg) => lg.id) ?? [],
      life_groups:
        user.lifeGroups?.map((lg) => ({ id: lg.id, name: lg.name })) ?? [],
      completed_courses: user.completedCourses
        ? user.completedCourses.map((course) => ({
            id: course.id,
            title: course.title,
          }))
        : [],
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
      return await this.entityManager.transaction(async (manager) => {
        // Resolve role by slug or default to 'member'
        const roleSlug = dto.role ?? 'member';
        const role = await manager.findOne(Role, {
          where: { slug: roleSlug },
        });
        if (!role) {
          throw new BadRequestException(`Invalid role: ${roleSlug}`);
        }

        // Resolve sector if provided
        let sector: Sector | null = null;
        if (dto.sectorId) {
          sector = await manager.findOne(Sector, {
            where: { id: dto.sectorId },
          });
          if (!sector) {
            throw new BadRequestException(`Invalid sector_id: ${dto.sectorId}`);
          }
        }

        // Resolve courses if provided
        let courses: Course[] = [];
        if (dto.completedCourses && dto.completedCourses.length > 0) {
          courses = await manager.findByIds(Course, dto.completedCourses);
          if (courses.length !== dto.completedCourses.length) {
            throw new BadRequestException('One or more invalid course IDs');
          }
        }

        let address: Address | null = null;
        if (dto.address) {
          const newAddress = new Address();
          newAddress.zipCode = dto.address.zip_code;
          newAddress.country = dto.address.country;
          newAddress.state = dto.address.state;
          newAddress.city = dto.address.city;
          newAddress.neighborhood = dto.address.neighborhood;
          newAddress.street = dto.address.street;
          newAddress.number = dto.address.number;
          newAddress.complement = dto.address.complement;
          address = await manager.save(Address, newAddress);
        }

        const user = new User();
        user.name = dto.name;
        user.email = dto.email;
        user.phoneNumber = dto.phone ?? null;
        user.address = address;
        user.birthDate = dto.birth_date ? new Date(dto.birth_date) : null;
        user.sector = sector;
        user.lifeGroups = [];
        user.completedCourses = courses;
        user.role = role;
        user.status = 'active';
        user.membershipDate = new Date();

        const saved = await manager.save(User, user);

        // Reload with relations for response
        const reloaded = await manager.findOne(User, {
          where: { id: saved.id },
          relations: ['sector', 'lifeGroups', 'completedCourses'],
        });

        return this.toResponse(reloaded!);
      });
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while creating the user.',
      );
    }
  }

  async search(
    q: string,
  ): Promise<
    { id: number; name: string; phone: string | null; email: string | null }[]
  > {
    const term = `%${q.trim().toLowerCase()}%`;
    const users = await this.entityManager
      .createQueryBuilder(User, 'u')
      .where(
        'LOWER(u.name) LIKE :term OR LOWER(u.email) LIKE :term OR u.phone_number LIKE :term',
        { term },
      )
      .orderBy('u.name', 'ASC')
      .take(30)
      .getMany();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phoneNumber ?? null,
      email: u.email ?? null,
    }));
  }

  async findAll() {
    try {
      const users = await this.entityManager.find(User, {
        relations: ['sector', 'lifeGroups', 'completedCourses'],
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
    const user = await this.entityManager.findOne(User, {
      where: { id },
      relations: ['sector', 'lifeGroups', 'completedCourses'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toResponse(user);
  }

  async findOneEntity(id: number): Promise<User> {
    const user = await this.entityManager.findOne(User, {
      where: { id },
      relations: ['sector', 'lifeGroups', 'completedCourses'],
    });
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

      if (dto.sectorId !== undefined) {
        if (dto.sectorId === null) {
          user.sector = null;
        } else {
          const sector = await this.entityManager.findOne(Sector, {
            where: { id: dto.sectorId },
          });
          if (!sector) {
            throw new BadRequestException(`Invalid sector_id: ${dto.sectorId}`);
          }
          user.sector = sector;
        }
      }

      if (dto.completedCourses !== undefined) {
        if (dto.completedCourses.length === 0) {
          user.completedCourses = [];
        } else {
          const courses = await this.entityManager.findByIds(
            Course,
            dto.completedCourses,
          );
          if (courses.length !== dto.completedCourses.length) {
            throw new BadRequestException('One or more invalid course IDs');
          }
          user.completedCourses = courses;
        }
      }

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

      // Reload with relations for response
      const reloaded = await this.entityManager.findOne(User, {
        where: { id: saved.id },
        relations: ['sector', 'lifeGroups', 'completedCourses'],
      });

      return this.toResponse(reloaded!);
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
      const reloaded = await this.entityManager.findOne(User, {
        where: { id: saved.id },
        relations: ['sector', 'lifeGroups', 'completedCourses'],
      });
      return this.toResponse(reloaded!);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the user role.',
      );
    }
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    try {
      const user = await this.findOneEntity(userId);

      if (dto.name !== undefined) user.name = dto.name;
      if (dto.phone !== undefined) user.phoneNumber = dto.phone ?? null;
      if (dto.birth_date !== undefined)
        user.birthDate = dto.birth_date ? new Date(dto.birth_date) : null;

      const saved = await this.entityManager.save(User, user);
      const reloaded = await this.entityManager.findOne(User, {
        where: { id: saved.id },
        relations: ['sector', 'lifeGroups', 'completedCourses'],
      });
      return this.toResponse(reloaded!);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'An error occurred while updating the profile.',
      );
    }
  }

  async lookupForForms(filters: { email?: string; phone?: string }) {
    const where: any[] = [];
    if (filters.email?.trim())
      where.push({ email: filters.email.trim().toLowerCase() });
    if (filters.phone?.trim())
      where.push({ phoneNumber: filters.phone.trim() });
    if (where.length === 0) return null;

    const user = await this.entityManager.findOne(User, {
      where,
      relations: ['lifeGroups', 'lifeGroups.leader', 'sector', 'address'],
    });
    if (!user) return null;

    const primaryLifeGroup = user.lifeGroups?.[0] ?? null;
    return {
      id: user.id,
      full_name: user.name,
      email: user.email,
      phone: user.phoneNumber,
      birth_date: user.birthDate,
      sector_id: user.sector?.id ?? null,
      life_group_id: primaryLifeGroup?.id ?? null,
      leader_id: primaryLifeGroup?.leader?.id ?? null,
    };
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOneEntity(id);
    await this.entityManager.remove(User, user);
  }
}
