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
      findOne: jest.fn(
        (entity: typeof Role | typeof User): Promise<Role | User | null> => {
          if (entity === Role) return Promise.resolve(role);
          if (entity === User) return Promise.resolve(makeUser());
          return Promise.resolve(null);
        },
      ),
      findByIds: jest.fn(),
      save: jest.fn(
        (
          entity: typeof Address | typeof User,
          value: Record<string, unknown>,
        ) => {
          if (entity === Address) return Promise.resolve({ ...value, id: 20 });
          if (entity === User) return Promise.resolve({ ...value, id: 10 });
          return Promise.resolve(value);
        },
      ),
      ...managerOverrides,
    };

    const entityManager = {
      transaction: jest.fn((callback: (manager: typeof txManager) => unknown) =>
        callback(txManager),
      ),
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
        }) as unknown,
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
      findOne: jest.fn(
        (entity: typeof Role | typeof User): Promise<Role | User | null> => {
          if (entity === Role) return Promise.resolve(role);
          return Promise.resolve(null);
        },
      ),
      findByIds: jest.fn(),
      save: jest.fn(
        (
          entity: typeof Address | typeof User,
          value: Record<string, unknown>,
        ) => {
          if (entity === Address) return Promise.resolve({ ...value, id: 20 });
          if (entity === User) throw new Error('user save failed');
          return Promise.resolve(value);
        },
      ),
    };
    const transactionMock = jest.fn(
      (callback: (manager: typeof txManager) => unknown) => callback(txManager),
    );
    const entityManager = {
      transaction: transactionMock,
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

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txManager.save).toHaveBeenCalledWith(Address, expect.any(Address));
    expect(txManager.save).toHaveBeenCalledWith(User, expect.any(User));
  });

  describe('deleteSelf', () => {
    function createDeleteService(userExists = true) {
      const txManager = {
        query: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      };
      const transactionMock = jest.fn(
        (callback: (manager: typeof txManager) => unknown) =>
          callback(txManager),
      );
      const entityManager = {
        findOne: jest
          .fn()
          .mockResolvedValue(userExists ? makeUser({ id: 10 }) : null),
        transaction: transactionMock,
      } as unknown as EntityManager;

      return {
        service: new UsersService(entityManager),
        entityManager,
        transactionMock,
        txManager,
      };
    }

    it('throws NotFoundException when the user does not exist', async () => {
      const { service, transactionMock } = createDeleteService(false);

      await expect(service.deleteSelf(10)).rejects.toThrow();
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('runs all cleanup queries and the final user delete inside a single transaction', async () => {
      const { service, transactionMock, txManager } = createDeleteService();

      await service.deleteSelf(10);

      expect(transactionMock).toHaveBeenCalledTimes(1);

      // Org-unit leadership references are cleared, not deleted.
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "ministries" SET "leader_id" = NULL'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE "ministries" SET "co_leader_id" = NULL',
        ),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE "ministry_teams" SET "leader_id" = NULL',
        ),
        [10],
      );

      // Personal submissions/reports authored by the user are deleted.
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "form_submission_audit_log"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "member_registrations"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "form_conversions"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "life_group_reports"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "sector_supervisor_reports"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "area_supervisor_reports"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "multiplications"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "service_reports"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "form_guests"'),
        [10],
      );
      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "meeting_reports"'),
        [10],
      );

      // The user row itself is hard-deleted last; cascading FKs
      // (accounts, device tokens, notification preferences, user_courses,
      // user_life_groups, member_journey_stages, ministry rosters) are
      // handled by the database.
      expect(txManager.delete).toHaveBeenCalledWith(User, 10);
    });

    it('rolls back all cleanup when the final delete fails', async () => {
      const txManager = {
        query: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockRejectedValue(new Error('fk violation')),
      };
      const entityManager = {
        findOne: jest.fn().mockResolvedValue(makeUser({ id: 10 })),
        transaction: jest.fn(
          (callback: (manager: typeof txManager) => unknown) =>
            callback(txManager),
        ),
      } as unknown as EntityManager;
      const service = new UsersService(entityManager);

      await expect(service.deleteSelf(10)).rejects.toThrow('fk violation');
    });
  });
});
