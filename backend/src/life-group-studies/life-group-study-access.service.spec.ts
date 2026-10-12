import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { LifeGroupStudyAccessService } from './life-group-study-access.service';
import { User } from '../users/entities/user.entity';

describe('LifeGroupStudyAccessService', () => {
  let service: LifeGroupStudyAccessService;

  const mockEntityManager = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const buildUser = (roleSlug: string | null, id = 1): User =>
    ({
      id,
      role: roleSlug ? { id: 1, name: roleSlug, slug: roleSlug } : undefined,
    }) as unknown as User;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifeGroupStudyAccessService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
      ],
    }).compile();

    service = module.get<LifeGroupStudyAccessService>(
      LifeGroupStudyAccessService,
    );
  });

  describe('canPublish', () => {
    it.each([
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ])('returns true for leadership role %s', async (roleSlug) => {
      const user = buildUser(roleSlug);
      await expect(service.canPublish(user)).resolves.toBe(true);
      expect(mockEntityManager.count).not.toHaveBeenCalled();
    });

    it('returns false for a plain member with no leadership and no grant', async () => {
      mockEntityManager.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      const user = buildUser('member');
      await expect(service.canPublish(user)).resolves.toBe(false);
    });

    it('returns true when user is leader or co-leader of a life group (matched by assignment, not role slug)', async () => {
      mockEntityManager.count.mockResolvedValueOnce(1);
      const user = buildUser('member');
      await expect(service.canPublish(user)).resolves.toBe(true);
    });

    it('returns true when user has an explicit publisher grant', async () => {
      mockEntityManager.count
        .mockResolvedValueOnce(0) // not a co-leader
        .mockResolvedValueOnce(1); // has a grant
      const user = buildUser('member');
      await expect(service.canPublish(user)).resolves.toBe(true);
    });
  });

  describe('resolveNotificationRecipients', () => {
    const u = (id: number) => ({ id }) as User;
    const qb = (rows: unknown[]) => ({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    });

    it('unions roster, leaders, co-leaders and leadership roles, deduped, excluding the publisher', async () => {
      mockEntityManager.createQueryBuilder
        .mockReturnValueOnce(qb([u(1), u(2), u(3)])) // roster
        .mockReturnValueOnce(
          qb([
            { leader: u(4), coLeader: u(2) },
            { leader: null, coLeader: u(5) },
          ]),
        ) // groups
        .mockReturnValueOnce(qb([u(6), u(3)])); // leadership roles

      const result = await service.resolveNotificationRecipients(1);

      expect(result.map((r) => r.id).sort((a, b) => a - b)).toEqual([
        2, 3, 4, 5, 6,
      ]);
    });

    it('includes an ordinary rostered member (previously never notified)', async () => {
      mockEntityManager.createQueryBuilder
        .mockReturnValueOnce(qb([u(10)]))
        .mockReturnValueOnce(qb([]))
        .mockReturnValueOnce(qb([]));

      const result = await service.resolveNotificationRecipients();
      expect(result.map((r) => r.id)).toEqual([10]);
    });
  });

  describe('canView', () => {
    it('returns true when the user belongs to at least one life group', async () => {
      const getCount = jest.fn().mockResolvedValue(1);
      mockEntityManager.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount,
      });
      const user = buildUser('member');
      await expect(service.canView(user)).resolves.toBe(true);
    });

    it('returns false when the user belongs to no life group', async () => {
      const getCount = jest.fn().mockResolvedValue(0);
      mockEntityManager.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount,
      });
      const user = buildUser('member');
      await expect(service.canView(user)).resolves.toBe(false);
    });

    it('returns true for a grant-holder with zero life-group memberships (canPublish OR-branch)', async () => {
      const getCount = jest.fn().mockResolvedValue(0);
      mockEntityManager.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount,
      });
      // Not a co-leader, but has an explicit publisher grant.
      mockEntityManager.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      const user = buildUser('member');

      await expect(service.canView(user)).resolves.toBe(true);
      // The life-group membership query must never run because canPublish
      // already returned true via the grant — this is the regression guard
      // for the escape-hatch fix.
      expect(getCount).not.toHaveBeenCalled();
    });
  });
});
