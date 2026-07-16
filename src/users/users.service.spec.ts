import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Address } from '../addresses/entities/address.entity';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService', () => {
  const role = { id: 1, slug: 'member' } as Role;

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 10,
      name: 'Maria Silva',
      email: 'maria@example.com',
      phoneNumber: '+5541999999999',
      birthDate: null,
      sector: null,
      lifeGroups: [],
      completedCourses: [],
      role,
      status: 'active',
      picture: null,
      membershipDate: new Date('2026-07-15T00:00:00.000Z'),
      createdAt: new Date('2026-07-15T00:00:00.000Z'),
      updatedAt: new Date('2026-07-15T00:00:00.000Z'),
      ...overrides,
    }) as User;

  const baseDto: CreateUserDto = {
    name: 'Maria Silva',
    email: 'maria@example.com',
    phone: '+5541999999999',
    role: 'member',
  };

  function createService(managerOverrides: Partial<EntityManager> = {}) {
    const txManager = {
      findOne: jest.fn(async (entity) => {
        if (entity === Role) return role;
        if (entity === User) return makeUser();
        return null;
      }),
      findByIds: jest.fn(),
      save: jest.fn(async (entity, value) => {
        if (entity === Address) return { ...value, id: 20 };
        if (entity === User) return { ...value, id: 10 };
        return value;
      }),
      ...managerOverrides,
    };

    const entityManager = {
      transaction: jest.fn((callback) => callback(txManager)),
    } as unknown as EntityManager;

    return {
      service: new UsersService(entityManager),
      entityManager,
      txManager,
    };
  }

  it('creates a user with a structured address and links the saved address', async () => {
    const { service, txManager } = createService();
    const dto: CreateUserDto = {
      ...baseDto,
      address: {
        zip_code: '80000-000',
        country: 'Brasil',
        state: 'PR',
        city: 'Curitiba',
        neighborhood: 'Centro',
        street: 'Rua XV de Novembro',
        number: 'S/N',
        complement: 'Casa 2',
      },
    };

    await service.create(dto);

    expect(txManager.save).toHaveBeenCalledWith(
      Address,
      expect.objectContaining({
        zipCode: '80000-000',
        country: 'Brasil',
        state: 'PR',
        city: 'Curitiba',
        neighborhood: 'Centro',
        street: 'Rua XV de Novembro',
        number: 'S/N',
        complement: 'Casa 2',
      }),
    );
    expect(txManager.save).toHaveBeenCalledWith(
      User,
      expect.objectContaining({
        name: 'Maria Silva',
        email: 'maria@example.com',
        phoneNumber: '+5541999999999',
        address: expect.objectContaining({
          id: 20,
          zipCode: '80000-000',
        }),
      }),
    );
  });

  it('creates a user without an address', async () => {
    const { service, txManager } = createService();

    await service.create(baseDto);

    expect(txManager.save).not.toHaveBeenCalledWith(
      Address,
      expect.any(Address),
    );
    expect(txManager.save).toHaveBeenCalledWith(
      User,
      expect.objectContaining({
        name: 'Maria Silva',
        address: null,
      }),
    );
  });

  it('uses the transaction for address and user saves so failed user creation rolls back the address', async () => {
    const txManager = {
      findOne: jest.fn(async (entity) => {
        if (entity === Role) return role;
        return null;
      }),
      findByIds: jest.fn(),
      save: jest.fn(async (entity, value) => {
        if (entity === Address) return { ...value, id: 20 };
        if (entity === User) throw new Error('user save failed');
        return value;
      }),
    };
    const entityManager = {
      transaction: jest.fn((callback) => callback(txManager)),
    } as unknown as EntityManager;
    const service = new UsersService(entityManager);

    await expect(
      service.create({
        ...baseDto,
        address: {
          zip_code: '80000000',
          country: 'Brasil',
          state: 'PR',
          city: 'Curitiba',
          neighborhood: 'Centro',
          street: 'Rua XV de Novembro',
          number: '123',
          complement: 'Apto 4',
        },
      }),
    ).rejects.toThrow(BadRequestException);

    expect(entityManager.transaction).toHaveBeenCalledTimes(1);
    expect(txManager.save).toHaveBeenCalledWith(Address, expect.any(Address));
    expect(txManager.save).toHaveBeenCalledWith(User, expect.any(User));
  });
});
