import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroupAttendanceService } from './life-group-attendance.service';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';

describe('LifeGroupAttendanceService', () => {
  const unrestrictedScope: ResolvedScope = {
    unrestricted: true,
    areaIds: [],
    sectorIds: [],
    lifeGroupIds: [],
  };
  const leaderScope: ResolvedScope = {
    unrestricted: false,
    areaIds: [],
    sectorIds: [],
    lifeGroupIds: [7],
  };
  const noAccessScope: ResolvedScope = {
    unrestricted: false,
    areaIds: [],
    sectorIds: [],
    lifeGroupIds: [],
  };

  const lifeGroup = {
    id: 7,
    leader: { id: 10 },
    coLeader: { id: 11 },
    users: [
      { id: 1, name: 'Bob' },
      { id: 2, name: 'Alice' },
    ],
  } as unknown as LifeGroup;

  function createService(overrides: Partial<EntityManager> = {}) {
    const em = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      save: jest.fn((...args: unknown[]) =>
        Promise.resolve(args.length > 1 ? args[1] : args[0]),
      ),
      transaction: jest.fn((cb: (trx: EntityManager) => unknown) =>
        cb(em as unknown as EntityManager),
      ),
      ...overrides,
    } as unknown as EntityManager;

    const auditService = { record: jest.fn().mockResolvedValue(undefined) };

    return {
      service: new LifeGroupAttendanceService(em, auditService as any),
      em,
      auditService,
    };
  }

  describe('access control', () => {
    it('allows a co-leader who has no life_group_leader scope entry', async () => {
      const { service, em } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup) // findLifeGroup
          .mockResolvedValueOnce(null), // existing attendance
      });

      const result = await service.getByDate(7, '2026-06-10', noAccessScope, {
        id: 11,
      });
      expect(result.is_draft).toBe(true);
      expect(em.findOne).toHaveBeenCalled();
    });

    it('rejects a user with no access at all', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValueOnce(lifeGroup),
      });

      await expect(
        service.getByDate(7, '2026-06-10', noAccessScope, { id: 999 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for an unknown life group', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(
        service.getByDate(999, '2026-06-10', unrestrictedScope, { id: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows the primary leader via lifeGroup.leader fallback even when scope grants nothing', async () => {
      const { service } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup) // findLifeGroup
          .mockResolvedValueOnce(null), // existing attendance
      });

      // actor.id 10 matches lifeGroup.leader.id, but noAccessScope has no
      // lifeGroupIds and is not unrestricted — access must come from the
      // direct leader-id fallback, not from ScopeResolverService.
      const result = await service.getByDate(7, '2026-06-10', noAccessScope, {
        id: 10,
      });
      expect(result.is_draft).toBe(true);
    });
  });

  describe('getByDate', () => {
    it('returns a draft built from the current roster when no record exists', async () => {
      const { service } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup)
          .mockResolvedValueOnce(null),
      });

      const result = await service.getByDate(7, '2026-06-10', leaderScope, {
        id: 10,
      });

      expect(result.is_draft).toBe(true);
      expect(result.entries).toEqual([
        { user_id: 2, name: 'Alice', present: false },
        { user_id: 1, name: 'Bob', present: false },
      ]);
    });

    it('returns the saved record when one exists', async () => {
      const existing = {
        id: 'att-1',
        lifeGroupId: 7,
        meetingDate: '2026-06-10',
        presentCount: 1,
        membersCount: 2,
        recordedBy: { id: 10 },
        entries: [
          { userId: 1, present: true, user: { name: 'Bob' } },
          { userId: 2, present: false, user: { name: 'Alice' } },
        ],
        createdAt: new Date('2026-06-10'),
        updatedAt: new Date('2026-06-10'),
      };
      const { service } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup)
          .mockResolvedValueOnce(existing),
      });

      const result = await service.getByDate(7, '2026-06-10', leaderScope, {
        id: 10,
      });

      expect(result.is_draft).toBe(false);
      expect(result.present_count).toBe(1);
    });
  });

  describe('upsert', () => {
    it('creates a new attendance record with entries on first save', async () => {
      const { service, em } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup) // findLifeGroup
          .mockResolvedValueOnce(null) // no existing attendance
          .mockResolvedValueOnce({
            id: 'att-2',
            entries: [],
            recordedBy: { id: 10 },
            createdAt: new Date(),
            updatedAt: new Date(),
          }), // reload after save
      });

      const result = await service.upsert(
        7,
        '2026-06-10',
        {
          entries: [
            { userId: 1, present: true },
            { userId: 2, present: false },
          ],
        },
        leaderScope,
        { id: 10 },
      );

      expect(em.save).toHaveBeenCalled();
      expect(result.id).toBe('att-2');
    });

    it('preserves the original roster snapshot when editing a past record', async () => {
      const existingEntries = [
        { userId: 1, present: false },
        { userId: 2, present: false },
      ];
      const existing = {
        id: 'att-1',
        lifeGroupId: 7,
        meetingDate: '2026-06-10',
        entries: existingEntries,
      };

      const { service, em } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({
            id: 'att-1',
            entries: existingEntries,
            recordedBy: { id: 10 },
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      });

      // Simulate a new member (id 3) joining later — should NOT be added.
      await service.upsert(
        7,
        '2026-06-10',
        {
          entries: [
            { userId: 1, present: true },
            { userId: 2, present: true },
            { userId: 3, present: true },
          ],
        },
        leaderScope,
        { id: 10 },
      );

      const savedAttendance = (em.save as jest.Mock).mock.calls[0][1];
      expect(savedAttendance.entries).toHaveLength(2);
      expect(savedAttendance.membersCount).toBe(2);
      expect(savedAttendance.presentCount).toBe(2);
    });

    it('rejects an unknown user_id on first save', async () => {
      const { service } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup) // findLifeGroup
          .mockResolvedValueOnce(null), // no existing attendance
      });

      await expect(
        service.upsert(
          7,
          '2026-06-10',
          {
            entries: [
              { userId: 1, present: true },
              { userId: 999, present: false },
            ],
          },
          leaderScope,
          { id: 10 },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate user_ids in the submitted DTO before persisting', async () => {
      const { service, em } = createService({
        findOne: jest.fn().mockResolvedValueOnce(lifeGroup), // findLifeGroup only
      });

      await expect(
        service.upsert(
          7,
          '2026-06-10',
          {
            entries: [
              { userId: 1, present: true },
              { userId: 1, present: false },
            ],
          },
          leaderScope,
          { id: 10 },
        ),
      ).rejects.toThrow(BadRequestException);

      // Duplicate check happens before the transaction ever opens.
      expect(em.transaction).not.toHaveBeenCalled();
    });

    it('retries once as an update when a concurrent double-submit hits the unique constraint', async () => {
      const conflictError = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      const existingAfterRace = {
        id: 'att-1',
        lifeGroupId: 7,
        meetingDate: '2026-06-10',
        entries: [
          { userId: 1, present: false },
          { userId: 2, present: false },
        ],
      };

      const findOne = jest
        .fn()
        .mockResolvedValueOnce(lifeGroup) // findLifeGroup (1st attempt)
        // 1st attempt's transaction rejects before its callback ever runs,
        // so no trx.findOne call happens for the first attempt.
        .mockResolvedValueOnce(lifeGroup) // findLifeGroup (retry)
        .mockResolvedValueOnce(existingAfterRace) // existing attendance found on retry
        .mockResolvedValueOnce({
          id: 'att-1',
          entries: existingAfterRace.entries,
          recordedBy: { id: 10 },
          createdAt: new Date(),
          updatedAt: new Date(),
        }); // reload after save on retry

      let transactionCalls = 0;
      const em = {
        findOne,
        find: jest.fn(),
        create: jest.fn((_entity: unknown, value: unknown) => value),
        save: jest.fn((...args: unknown[]) =>
          Promise.resolve(args.length > 1 ? args[1] : args[0]),
        ),
        transaction: jest.fn((cb: (trx: EntityManager) => unknown) => {
          transactionCalls += 1;
          if (transactionCalls === 1) {
            return Promise.reject(conflictError);
          }
          return cb(em as unknown as EntityManager);
        }),
      } as unknown as EntityManager;
      const auditService = { record: jest.fn().mockResolvedValue(undefined) };
      const service = new LifeGroupAttendanceService(em, auditService as any);

      const result = await service.upsert(
        7,
        '2026-06-10',
        {
          entries: [
            { userId: 1, present: true },
            { userId: 2, present: true },
          ],
        },
        leaderScope,
        { id: 10 },
      );

      expect(transactionCalls).toBe(2);
      expect(result.id).toBe('att-1');
    });

    it('calls auditService.record with action "create" on first save', async () => {
      const { service, auditService } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 'att-2',
            entries: [],
            recordedBy: { id: 10 },
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        // Simulate TypeORM assigning a DB-generated id on insert.
        save: jest.fn((_entity: unknown, value: Record<string, unknown>) =>
          Promise.resolve({ ...value, id: 'att-2' }),
        ),
      });

      await service.upsert(
        7,
        '2026-06-10',
        {
          entries: [
            { userId: 1, present: true },
            { userId: 2, present: false },
          ],
        },
        leaderScope,
        { id: 10 },
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          formSlug: 'life_group_attendance',
          submissionId: 'att-2',
          actorId: 10,
          action: 'create',
        }),
      );
    });

    it('calls auditService.record with action "update" when editing an existing record', async () => {
      const existingEntries = [
        { userId: 1, present: false },
        { userId: 2, present: false },
      ];
      const existing = {
        id: 'att-1',
        lifeGroupId: 7,
        meetingDate: '2026-06-10',
        entries: existingEntries,
      };

      const { service, auditService } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({
            id: 'att-1',
            entries: existingEntries,
            recordedBy: { id: 10 },
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      });

      await service.upsert(
        7,
        '2026-06-10',
        {
          entries: [
            { userId: 1, present: true },
            { userId: 2, present: true },
          ],
        },
        leaderScope,
        { id: 10 },
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          formSlug: 'life_group_attendance',
          submissionId: 'att-1',
          actorId: 10,
          action: 'update',
        }),
      );
    });
  });

  describe('assertValidMeetingDate (via getByDate)', () => {
    const todayKey = new Date().toISOString().slice(0, 10);

    it('rejects an invalid format', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValueOnce(lifeGroup),
      });

      await expect(
        service.getByDate(7, '06-10-2026', unrestrictedScope, { id: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid calendar date', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValueOnce(lifeGroup),
      });

      await expect(
        service.getByDate(7, '2026-02-30', unrestrictedScope, { id: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a future date', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValueOnce(lifeGroup),
      });

      await expect(
        service.getByDate(7, '2099-01-01', unrestrictedScope, { id: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a past date', async () => {
      const { service } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup)
          .mockResolvedValueOnce(null),
      });

      const result = await service.getByDate(
        7,
        '2020-01-01',
        unrestrictedScope,
        { id: 1 },
      );
      expect(result.is_draft).toBe(true);
    });

    it('accepts today', async () => {
      const { service } = createService({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(lifeGroup)
          .mockResolvedValueOnce(null),
      });

      const result = await service.getByDate(
        7,
        todayKey,
        unrestrictedScope,
        { id: 1 },
      );
      expect(result.is_draft).toBe(true);
    });
  });
});
