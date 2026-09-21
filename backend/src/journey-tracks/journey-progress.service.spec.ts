import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JourneyProgressService } from './journey-progress.service';
import { JourneyTrack } from './entities/journey-track.entity';
import { JourneyTrackStep } from './entities/journey-track-step.entity';
import { MemberJourneyStepProgress } from './entities/member-journey-step-progress.entity';
import { User } from '../users/entities/user.entity';

type EntityRef = new (...args: unknown[]) => unknown;

function buildInsertQueryBuilderMock() {
  const qb = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  return qb;
}

function buildManagerMock(overrides: Record<string, unknown> = {}) {
  const insertQb = buildInsertQueryBuilderMock();
  const manager = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(insertQb),
    ...overrides,
  };
  return { manager, insertQb };
}

function buildScopeResolverMock(resolve: unknown) {
  return { resolve: jest.fn().mockResolvedValue(resolve) };
}

describe('JourneyProgressService - syncCourseCompletion', () => {
  it('fans out across every track referencing the same course', async () => {
    const stepsForCourse = [
      { id: 1, trackId: 1, courseId: 'course-1', type: 'course_completion' },
      { id: 2, trackId: 2, courseId: 'course-1', type: 'course_completion' },
      { id: 3, trackId: 3, courseId: 'course-1', type: 'course_completion' },
    ] as JourneyTrackStep[];

    const { manager, insertQb } = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return stepsForCourse;
        return [];
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await service.syncCourseCompletion(1, 'course-1');

    expect(insertQb.execute).toHaveBeenCalledTimes(3);
    expect(insertQb.values).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        memberId: 1,
        stepId: 1,
        source: 'course_completion',
      }),
    );
    expect(insertQb.values).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        memberId: 1,
        stepId: 2,
        source: 'course_completion',
      }),
    );
    expect(insertQb.values).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        memberId: 1,
        stepId: 3,
        source: 'course_completion',
      }),
    );
  });

  it('is idempotent on a second call (relies on ON CONFLICT DO NOTHING, no duplicate logical insert)', async () => {
    const stepsForCourse = [
      { id: 1, trackId: 1, courseId: 'course-1', type: 'course_completion' },
    ] as JourneyTrackStep[];

    const { manager, insertQb } = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return stepsForCourse;
        return [];
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await service.syncCourseCompletion(1, 'course-1');
    await service.syncCourseCompletion(1, 'course-1');

    // Each call issues one INSERT ... ON CONFLICT DO NOTHING per matching
    // step — the second call is a no-op at the DB level, but at the service
    // layer it must not throw and must not change its call shape.
    expect(insertQb.orIgnore).toHaveBeenCalledTimes(2);
    expect(insertQb.execute).toHaveBeenCalledTimes(2);
  });

  it('swallows and logs errors without throwing to the caller', async () => {
    const manager = {
      find: jest.fn().mockRejectedValue(new Error('db exploded')),
    };
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.syncCourseCompletion(1, 'course-1'),
    ).resolves.toBeUndefined();
  });
});

describe('JourneyProgressService - approveStep', () => {
  it('rejects approving a step that is not manual_approval (400)', async () => {
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'course_completion' } as JourneyTrackStep;
        }
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.approveStep({ id: 99, role: { slug: 'admin' } }, 5, 1, null),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows admin to approve any member', async () => {
    const { manager, insertQb } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'manual_approval' } as JourneyTrackStep;
        }
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: false });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await service.approveStep({ id: 99, role: { slug: 'admin' } }, 5, 1, 'ok');

    expect(insertQb.execute).toHaveBeenCalledTimes(1);
    expect(insertQb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 5,
        stepId: 1,
        source: 'manual_approval',
        completedByUserId: 99,
        note: 'ok',
      }),
    );
  });

  it('allows a life_group_leader to approve a member in their own group but 403s for an outside member', async () => {
    const memberInGroup = {
      id: 5,
      sector: { id: 10, area: { id: 100 } },
      lifeGroups: [{ id: 1 }],
    } as User;
    const memberOutsideGroup = {
      id: 6,
      sector: { id: 20, area: { id: 200 } },
      lifeGroups: [{ id: 2 }],
    } as User;

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef, opts) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'manual_approval' } as JourneyTrackStep;
        }
        if (entity === User) {
          const memberId = (opts as { where: { id: number } }).where.id;
          return memberId === 5 ? memberInGroup : memberOutsideGroup;
        }
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [1],
    });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.approveStep(
        { id: 50, role: { slug: 'life_group_leader' } },
        5,
        1,
        null,
      ),
    ).resolves.toBeUndefined();

    await expect(
      service.approveStep(
        { id: 50, role: { slug: 'life_group_leader' } },
        6,
        1,
        null,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('scopes a sector_leader to members of their sector', async () => {
    const memberInSector = {
      id: 5,
      sector: { id: 10 },
      lifeGroups: [],
    } as User;

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'manual_approval' } as JourneyTrackStep;
        }
        if (entity === User) return memberInSector;
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({
      unrestricted: false,
      areaIds: [],
      sectorIds: [10],
      lifeGroupIds: [],
    });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.approveStep(
        { id: 51, role: { slug: 'sector_leader' } },
        5,
        1,
        null,
      ),
    ).resolves.toBeUndefined();
  });

  it('blocks a life_group_leader from approving their own step (self-approval)', async () => {
    const selfAsMember = {
      id: 50,
      sector: { id: 10, area: { id: 100 } },
      lifeGroups: [{ id: 1 }],
    } as User;

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'manual_approval' } as JourneyTrackStep;
        }
        if (entity === User) return selfAsMember;
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [1],
    });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.approveStep(
        { id: 50, role: { slug: 'life_group_leader' } },
        50,
        1,
        null,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks a sector_leader from approving their own step (self-approval)', async () => {
    const selfAsMember = {
      id: 51,
      sector: { id: 10 },
      lifeGroups: [],
    } as User;

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'manual_approval' } as JourneyTrackStep;
        }
        if (entity === User) return selfAsMember;
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({
      unrestricted: false,
      areaIds: [],
      sectorIds: [10],
      lifeGroupIds: [],
    });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.approveStep(
        { id: 51, role: { slug: 'sector_leader' } },
        51,
        1,
        null,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks an area_leader from approving their own step (self-approval)', async () => {
    const selfAsMember = {
      id: 52,
      sector: { id: 10, area: { id: 100 } },
      lifeGroups: [],
    } as User;

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'manual_approval' } as JourneyTrackStep;
        }
        if (entity === User) return selfAsMember;
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({
      unrestricted: false,
      areaIds: [100],
      sectorIds: [],
      lifeGroupIds: [],
    });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.approveStep(
        { id: 52, role: { slug: 'area_leader' } },
        52,
        1,
        null,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows admin to self-approve (exempted from the self-approval guard)', async () => {
    const { manager, insertQb } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'manual_approval' } as JourneyTrackStep;
        }
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.approveStep({ id: 99, role: { slug: 'admin' } }, 99, 1, null),
    ).resolves.toBeUndefined();
    expect(insertQb.execute).toHaveBeenCalledTimes(1);
  });
});

describe('JourneyProgressService - getForMember', () => {
  it('excludes informational steps from the progress denominator', async () => {
    const tracks = [{ id: 1, isActive: true }] as JourneyTrack[];
    const steps = [
      { id: 1, trackId: 1, type: 'manual_approval', sortOrder: 0 },
      { id: 2, trackId: 1, type: 'informational', sortOrder: 1 },
    ] as JourneyTrackStep[];
    const progressRows = [
      { stepId: 1, completedAt: new Date(), source: 'manual_approval' },
    ] as MemberJourneyStepProgress[];

    const { manager } = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrack) return tracks;
        if (entity === JourneyTrackStep) return steps;
        if (entity === MemberJourneyStepProgress) return progressRows;
        return [];
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    const result = await service.getForMember(5);

    // 1 completed manual_approval step out of 1 tracked step (informational
    // excluded) => 100%, not 50%.
    expect(result[0].progress_percentage).toBe(100);
  });

  it('does not write any rows for incomplete steps (pure read)', async () => {
    const tracks = [{ id: 1, isActive: true }] as JourneyTrack[];
    const steps = [
      { id: 1, trackId: 1, type: 'manual_approval', sortOrder: 0 },
    ] as JourneyTrackStep[];

    const { manager, insertQb } = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrack) return tracks;
        if (entity === JourneyTrackStep) return steps;
        return [];
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    const result = await service.getForMember(5);

    expect(result[0].steps[0].completed).toBe(false);
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    expect(insertQb.execute).not.toHaveBeenCalled();
  });
});
