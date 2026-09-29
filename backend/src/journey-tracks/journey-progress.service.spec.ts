import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JourneyProgressService } from './journey-progress.service';
import { JourneyTrack } from './entities/journey-track.entity';
import { JourneyTrackStep } from './entities/journey-track-step.entity';
import { MemberJourneyStepProgress } from './entities/member-journey-step-progress.entity';
import { Role } from '../roles/entities/role.entity';
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
    count: jest.fn().mockResolvedValue(0),
    query: jest.fn().mockResolvedValue([[], 0]),
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
          return {
            id: 1,
            type: 'manual_approval',
            trackId: 1,
          } as JourneyTrackStep;
        }
        if (entity === User) return { id: 5, role: { slug: 'guest' } };
        if (entity === JourneyTrack) {
          return { id: 1, key: 'become_member', isActive: true };
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
      role: { slug: 'guest' },
      sector: { id: 10, area: { id: 100 } },
      lifeGroups: [{ id: 1 }],
    } as User;
    const memberOutsideGroup = {
      id: 6,
      role: { slug: 'guest' },
      sector: { id: 20, area: { id: 200 } },
      lifeGroups: [{ id: 2 }],
    } as User;

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef, opts) => {
        if (entity === JourneyTrackStep) {
          return {
            id: 1,
            type: 'manual_approval',
            trackId: 1,
          } as JourneyTrackStep;
        }
        if (entity === User) {
          const memberId = (opts as { where: { id: number } }).where.id;
          return memberId === 5 ? memberInGroup : memberOutsideGroup;
        }
        if (entity === JourneyTrack) {
          return { id: 1, key: 'become_member', isActive: true };
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
      role: { slug: 'guest' },
      sector: { id: 10 },
      lifeGroups: [],
    } as User;

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return {
            id: 1,
            type: 'manual_approval',
            trackId: 1,
          } as JourneyTrackStep;
        }
        if (entity === User) return memberInSector;
        if (entity === JourneyTrack) {
          return { id: 1, key: 'become_member', isActive: true };
        }
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
          return {
            id: 1,
            type: 'manual_approval',
            trackId: 1,
          } as JourneyTrackStep;
        }
        if (entity === User) return { id: 99, role: { slug: 'guest' } };
        if (entity === JourneyTrack) {
          return { id: 1, key: 'become_member', isActive: true };
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

  it('rejects approving a step from a different track than the member is currently on, even for an actor with full scope/leadership permission over the member', async () => {
    // Member is currently a 'member' (role-track-map: member -> 'discipler'
    // track), but the step being approved belongs to the unrelated 'leader'
    // track. Without the current-track guard, an actor with scope over this
    // member (or even an admin) could walk them straight to
    // 'life_group_leader' by approving 'leader' track steps out of order.
    const { manager, insertQb } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return {
            id: 42,
            type: 'manual_approval',
            trackId: 99, // belongs to the 'leader' track, not 'discipler'
          } as JourneyTrackStep;
        }
        if (entity === User) return { id: 5, role: { slug: 'member' } };
        if (entity === JourneyTrack) {
          // The member's actual current track ('discipler', per
          // role-track-map for role 'member') has a different id than the
          // step's trackId above.
          return { id: 5, key: 'discipler', isActive: true };
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
      service.approveStep({ id: 99, role: { slug: 'admin' } }, 5, 42, null),
    ).rejects.toThrow(BadRequestException);
    expect(insertQb.execute).not.toHaveBeenCalled();

    // Also true for a leadership actor with genuine scope over the member.
    await expect(
      service.approveStep(
        { id: 50, role: { slug: 'life_group_leader' } },
        5,
        42,
        null,
      ),
    ).rejects.toThrow(BadRequestException);
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

describe('JourneyProgressService - getCurrentTrackForMember', () => {
  const track = {
    id: 1,
    key: 'become_member',
    title: 'Como se tornar Membro',
    isActive: true,
  } as JourneyTrack;
  const steps = [
    { id: 1, trackId: 1, type: 'manual_approval', sortOrder: 0 },
  ] as JourneyTrackStep[];

  it("resolves the 'become_member' track for a 'guest'", async () => {
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === User) return { id: 5, role: { slug: 'guest' } };
        if (entity === JourneyTrack) return track;
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return steps;
        return [];
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    const result = await service.getCurrentTrackForMember(5);

    expect(result.track?.track.key).toBe('become_member');
    expect(result.all_steps_complete).toBe(false);
  });

  it("resolves the 'discipler' track for a 'discipler'", async () => {
    const disciplerTrack = { ...track, id: 2, key: 'discipler' };
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === User) return { id: 6, role: { slug: 'discipler' } };
        if (entity === JourneyTrack) return disciplerTrack;
        return null;
      }),
      find: jest.fn().mockResolvedValue([]),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    const result = await service.getCurrentTrackForMember(6);

    expect(result.track?.track.key).toBe('discipler');
  });

  it("resolves the 'member' track for a 'member'", async () => {
    const memberTrack = { ...track, id: 3, key: 'member' };
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === User) return { id: 7, role: { slug: 'member' } };
        if (entity === JourneyTrack) return memberTrack;
        return null;
      }),
      find: jest.fn().mockResolvedValue([]),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    const result = await service.getCurrentTrackForMember(7);

    expect(result.track?.track.key).toBe('member');
  });

  it('returns no track for a life_group_leader (no mapped track)', async () => {
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === User)
          return { id: 8, role: { slug: 'life_group_leader' } };
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    const result = await service.getCurrentTrackForMember(8);

    expect(result).toEqual({ track: null, all_steps_complete: false });
  });

  it('returns no track for an unknown role', async () => {
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === User) return { id: 9, role: { slug: 'admin' } };
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    const result = await service.getCurrentTrackForMember(9);

    expect(result).toEqual({ track: null, all_steps_complete: false });
  });

  it('returns no track when the mapped track is inactive/missing', async () => {
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === User) return { id: 5, role: { slug: 'guest' } };
        if (entity === JourneyTrack) return null;
        return null;
      }),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    const result = await service.getCurrentTrackForMember(5);

    expect(result).toEqual({ track: null, all_steps_complete: false });
  });

  it('sets all_steps_complete=true only when every tracked step is completed', async () => {
    const progressRows = [
      { stepId: 1, completedAt: new Date(), source: 'manual_approval' },
    ] as MemberJourneyStepProgress[];
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === User) return { id: 5, role: { slug: 'guest' } };
        if (entity === JourneyTrack) return track;
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
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

    const result = await service.getCurrentTrackForMember(5);

    expect(result.all_steps_complete).toBe(true);
  });
});

describe('JourneyProgressService - syncRolePromotion (via approveStep)', () => {
  it('promotes a guest to member exactly when the completing approveStep call finishes the become_member track', async () => {
    const guestUser = { id: 5, role: { slug: 'guest' } };
    const becomeMemberTrack = {
      id: 1,
      key: 'become_member',
      promotesToRole: 'member',
    } as JourneyTrack;
    const trackedSteps = [
      { id: 1, trackId: 1, type: 'manual_approval' },
    ] as JourneyTrackStep[];
    const memberRole = { id: 6, slug: 'member' } as Role;

    const { manager, insertQb } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) {
          return { id: 1, type: 'manual_approval', trackId: 1 };
        }
        if (entity === User) return guestUser;
        if (entity === JourneyTrack) return becomeMemberTrack;
        if (entity === Role) return memberRole;
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return trackedSteps;
        return [];
      }),
      count: jest.fn().mockResolvedValue(1),
      query: jest.fn().mockResolvedValue([[], 1]),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await service.approveStep({ id: 99, role: { slug: 'admin' } }, 5, 1, null);

    expect(insertQb.execute).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "users"'),
      [memberRole.id, 5, 'guest'],
    );
  });

  it('does not promote while steps are still incomplete', async () => {
    const guestUser = { id: 5, role: { slug: 'guest' } };
    const becomeMemberTrack = {
      id: 1,
      key: 'become_member',
      promotesToRole: 'member',
    } as JourneyTrack;
    const trackedSteps = [
      { id: 1, trackId: 1, type: 'manual_approval' },
      { id: 2, trackId: 1, type: 'manual_approval' },
    ] as JourneyTrackStep[];

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep)
          return { id: 1, type: 'manual_approval', trackId: 1 };
        if (entity === User) return guestUser;
        if (entity === JourneyTrack) return becomeMemberTrack;
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return trackedSteps;
        return [];
      }),
      count: jest.fn().mockResolvedValue(1),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await service.approveStep({ id: 99, role: { slug: 'admin' } }, 5, 1, null);

    expect(manager.query).not.toHaveBeenCalled();
  });

  it('is idempotent on a second completing call (no duplicate promotion side effects thrown)', async () => {
    const guestUser = { id: 5, role: { slug: 'guest' } };
    const becomeMemberTrack = {
      id: 1,
      key: 'become_member',
      promotesToRole: 'member',
    } as JourneyTrack;
    const trackedSteps = [
      { id: 1, trackId: 1, type: 'manual_approval' },
    ] as JourneyTrackStep[];
    const memberRole = { id: 6, slug: 'member' } as Role;

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep)
          return { id: 1, type: 'manual_approval', trackId: 1 };
        if (entity === User) return guestUser;
        if (entity === JourneyTrack) return becomeMemberTrack;
        if (entity === Role) return memberRole;
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return trackedSteps;
        return [];
      }),
      count: jest.fn().mockResolvedValue(1),
      // Second call: role_id no longer matches 'guest' (already promoted),
      // so the conditional UPDATE affects 0 rows — must not throw.
      query: jest.fn().mockResolvedValue([[], 0]),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await expect(
      service.approveStep({ id: 99, role: { slug: 'admin' } }, 5, 1, null),
    ).resolves.toBeUndefined();
    await expect(
      service.approveStep({ id: 99, role: { slug: 'admin' } }, 5, 1, null),
    ).resolves.toBeUndefined();
  });

  it('never promotes when promotes_to_role is NULL on the track', async () => {
    const guestUser = { id: 5, role: { slug: 'guest' } };
    const noPromoTrack = {
      id: 1,
      key: 'become_member',
      promotesToRole: null,
    } as JourneyTrack;
    const trackedSteps = [
      { id: 1, trackId: 1, type: 'manual_approval' },
    ] as JourneyTrackStep[];

    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep)
          return { id: 1, type: 'manual_approval', trackId: 1 };
        if (entity === User) return guestUser;
        if (entity === JourneyTrack) return noPromoTrack;
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return trackedSteps;
        return [];
      }),
      count: jest.fn().mockResolvedValue(1),
    });
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new JourneyProgressService(
      manager as never,
      scopeResolver as never,
    );

    await service.approveStep({ id: 99, role: { slug: 'admin' } }, 5, 1, null);

    expect(manager.query).not.toHaveBeenCalled();
  });

  it('swallows errors from the promotion sync without throwing to approveStep caller', async () => {
    // The first User lookup is the current-track guard (assertStepBelongsToMemberCurrentTrack,
    // must succeed so approveStep proceeds); the second is inside the
    // best-effort syncRolePromotion, which must swallow its own failure.
    let userLookupCount = 0;
    const { manager } = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep)
          return { id: 1, type: 'manual_approval', trackId: 1 };
        if (entity === JourneyTrack) {
          return { id: 1, key: 'become_member', isActive: true };
        }
        if (entity === User) {
          userLookupCount += 1;
          if (userLookupCount === 1) return { id: 5, role: { slug: 'guest' } };
          throw new Error('db exploded');
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
    ).resolves.toBeUndefined();
  });
});
