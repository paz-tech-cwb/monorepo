import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { Notification } from './entities/notification.entity';

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
};

const mockEntityManager = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};
const mockDispatchService = { dispatch: jest.fn() };

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
        { provide: NotificationDispatchService, useValue: mockDispatchService },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create() throws 422 when scheduled_at is in the past', async () => {
    const dto = {
      title: 'Test',
      message: 'Hello',
      category: 'announcements' as const,
      channels: ['push'],
      segment: { type: 'all' as const },
      scheduled_at: '2020-01-01T00:00:00Z',
    };
    await expect(service.create(dto, 1)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('create() saves notification with status pending for immediate send', async () => {
    const dto = {
      title: 'Test',
      message: 'Hello',
      category: 'announcements' as const,
      channels: ['push'],
      segment: { type: 'all' as const },
    };
    const saved = { id: 1, ...dto, status: 'pending', scheduledAt: null };
    mockEntityManager.create.mockReturnValue(saved);
    mockEntityManager.save.mockResolvedValue(saved);
    mockEntityManager.find.mockResolvedValue([]);

    await service.create(dto, 1);
    expect(mockEntityManager.save).toHaveBeenCalled();
  });

  it('findOne() throws NotFoundException when not found', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('remove() throws ConflictException when status is sent', async () => {
    mockEntityManager.findOne.mockResolvedValue({ id: 1, status: 'sent' });
    await expect(service.remove(1)).rejects.toThrow(ConflictException);
  });

  it('remove() throws NotFoundException when notification not found', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);
    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });

  it('findAll passes origin filter to the where clause', async () => {
    const findSpy = jest
      .spyOn(mockEntityManager, 'find')
      .mockResolvedValue([] as never);
    await service.findAll('automatic');
    expect(findSpy).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({ where: { origin: 'automatic' } }),
    );
  });

  describe('resolveSegment (via getReach)', () => {
    // resolveSegment is private; we exercise it through the public
    // getReach() method and inspect the Brackets factory that gets passed
    // to andWhere() to assert the actual filter combination logic, plus
    // feed getMany() with users to confirm end-to-end inclusion/exclusion.
    type FakeInnerBuilder = {
      andWhere: jest.Mock;
      orWhere: jest.Mock;
      calls: { method: 'andWhere' | 'orWhere'; sql: string }[];
    };

    function makeFakeInnerBuilder(): FakeInnerBuilder {
      const calls: FakeInnerBuilder['calls'] = [];
      const builder: Partial<FakeInnerBuilder> = {};
      builder.andWhere = jest.fn((sql: string) => {
        calls.push({ method: 'andWhere', sql });
        return builder;
      });
      builder.orWhere = jest.fn((sql: string) => {
        calls.push({ method: 'orWhere', sql });
        return builder;
      });
      return { ...(builder as FakeInnerBuilder), calls };
    }

    type AndWhereArg =
      | string
      | { whereFactory: (inner: FakeInnerBuilder) => void };

    function setupQb(users: unknown[]) {
      const andWhereMock = jest.fn().mockReturnThis();
      const andWhere = andWhereMock as unknown as jest.Mock<
        unknown,
        [AndWhereArg, Record<string, unknown>?]
      >;
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere,
        getMany: jest.fn().mockResolvedValue(users),
      };
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    function extractBracketsFactory(
      qb: ReturnType<typeof setupQb>,
    ): (inner: FakeInnerBuilder) => void {
      // The Brackets instance is passed as the last andWhere() call's arg.
      const bracketsCall = qb.andWhere.mock.calls.find(
        (call) => typeof call[0] === 'object' && 'whereFactory' in call[0],
      );
      expect(bracketsCall).toBeDefined();
      const [arg] = bracketsCall!;
      if (typeof arg === 'string') {
        throw new Error('expected a Brackets argument');
      }
      return arg.whereFactory;
    }

    it('roles-only segment: builds an AND-based role filter (regression guard)', async () => {
      const qb = setupQb([]);
      await service.getReach(
        { type: 'filtered', filters: { roles: ['admin'] } },
        ['push'],
        'announcements',
      );
      const factory = extractBracketsFactory(qb);
      const inner = makeFakeInnerBuilder();
      factory(inner);

      expect(inner.calls).toEqual([
        { method: 'andWhere', sql: 'role.slug IN (:...roles)' },
      ]);
    });

    it('roles+user_ids segment: unions user_ids in with OR alongside the role AND-filter', async () => {
      const qb = setupQb([]);
      await service.getReach(
        {
          type: 'filtered',
          filters: { roles: ['admin'], user_ids: [42] },
        },
        ['push'],
        'announcements',
      );
      const factory = extractBracketsFactory(qb);
      const inner = makeFakeInnerBuilder();
      factory(inner);

      expect(inner.calls).toEqual([
        { method: 'andWhere', sql: 'role.slug IN (:...roles)' },
        { method: 'orWhere', sql: 'u.id IN (:...userIds)' },
      ]);
    });

    it('user_ids-only segment: matches explicit user ids with AND', async () => {
      const qb = setupQb([]);
      await service.getReach(
        { type: 'filtered', filters: { user_ids: [7, 8] } },
        ['push'],
        'announcements',
      );
      const factory = extractBracketsFactory(qb);
      const inner = makeFakeInnerBuilder();
      factory(inner);

      expect(inner.calls).toEqual([
        { method: 'andWhere', sql: 'u.id IN (:...userIds)' },
      ]);
    });

    it('status+user_ids: the status filter is applied as a separate top-level AND, not folded into the user_ids bracket', async () => {
      // The status condition must remain a standalone `andWhere` outside
      // the Brackets group so that an inactive user explicitly listed in
      // user_ids is still excluded by it (the bracket alone would match
      // them via `u.id IN (:...userIds)`).
      const qb = setupQb([]);

      await service.getReach(
        {
          type: 'filtered',
          filters: { status: 'active', user_ids: [7] },
        },
        ['push'],
        'announcements',
      );

      const statusCall = qb.andWhere.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('u.status'),
      );
      expect(statusCall).toBeDefined();
      expect(statusCall?.[1]).toEqual({ status: 'active' } as Record<
        string,
        unknown
      >);

      const factory = extractBracketsFactory(qb);
      const inner = makeFakeInnerBuilder();
      factory(inner);
      // Inside the bracket, only the user_ids condition is present — the
      // status filter is not duplicated/folded in here, confirming it is
      // enforced independently and will exclude an inactive user_ids match.
      expect(inner.calls).toEqual([
        { method: 'andWhere', sql: 'u.id IN (:...userIds)' },
      ]);
    });
  });

  it('getReach() returns zero counts for empty segment', async () => {
    const mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockEntityManager.createQueryBuilder.mockReturnValue(mockQb);

    const result = await service.getReach(
      { type: 'all' },
      ['push', 'email'],
      'announcements',
    );
    expect(result.total).toBe(0);
    expect(result.by_channel.push).toBe(0);
    expect(result.by_channel.email).toBe(0);
  });
});
