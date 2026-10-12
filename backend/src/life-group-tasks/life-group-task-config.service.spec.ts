import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { LifeGroupTaskConfigService } from './life-group-task-config.service';
import { LifeGroupTaskRosterService } from './life-group-task-roster.service';
import { LifeGroupTaskMemberSetting } from './entities/life-group-task-member-setting.entity';
import { LifeGroupTaskOverride } from './entities/life-group-task-override.entity';
import { LifeGroupTaskTemplate } from './entities/life-group-task-template.entity';
import { LifeGroupTaskGroupSetting } from './entities/life-group-task-group-setting.entity';

const unrestricted: ResolvedScope = {
  unrestricted: true,
  areaIds: [],
  sectorIds: [],
  lifeGroupIds: [],
};
const noAccess: ResolvedScope = {
  unrestricted: false,
  areaIds: [],
  sectorIds: [],
  lifeGroupIds: [],
};
const scoped: ResolvedScope = { ...noAccess, lifeGroupIds: [7] };

const leader = { id: 10, name: 'Lia Leader', status: 'active' };
const coLeader = { id: 11, name: 'Caio Co', status: 'active' };
const bob = { id: 1, name: 'Bob', status: 'active' };
const ghost = { id: 3, name: 'Gus Inactive', status: 'inactive' };

const group = {
  id: 7,
  leader,
  coLeader,
  users: [bob, ghost],
} as unknown as LifeGroup;

const palavra = {
  id: 1,
  name: 'Palavra',
  description: 'd',
  guidance: 'g',
  sortOrder: 0,
  isActive: true,
};

function makeService(
  data: {
    settings?: unknown[];
    overrides?: unknown[];
    groupSetting?: unknown;
    joinedRows?: unknown[];
  } = {},
) {
  const insertQb = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const em = {
    findOne: jest.fn((entity: unknown) => {
      if (entity === LifeGroup) return Promise.resolve(group);
      if (entity === LifeGroupTaskGroupSetting) {
        return Promise.resolve(data.groupSetting ?? null);
      }
      return Promise.resolve(null);
    }),
    find: jest.fn((entity: unknown) => {
      if (entity === LifeGroupTaskMemberSetting) {
        return Promise.resolve(data.settings ?? []);
      }
      if (entity === LifeGroupTaskOverride) {
        return Promise.resolve(data.overrides ?? []);
      }
      if (entity === LifeGroupTaskTemplate) return Promise.resolve([palavra]);
      return Promise.resolve([]);
    }),
    query: jest.fn((sql: string) =>
      Promise.resolve(
        sql.includes('life_group_attendance_entries')
          ? [{ user_id: 1, present_count: 1 }]
          : (data.joinedRows ?? []),
      ),
    ),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
    remove: jest.fn((value: unknown) => Promise.resolve(value)),
    delete: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(() => insertQb),
  };
  const roster = new LifeGroupTaskRosterService(em as unknown as EntityManager);
  const service = new LifeGroupTaskConfigService(
    em as unknown as EntityManager,
    roster,
  );
  return { service, em, insertQb };
}

describe('LifeGroupTaskConfigService', () => {
  describe('authorization (ScopeGuard + co_leader_id fallback)', () => {
    it('forbids users outside the group scope on every endpoint', async () => {
      const { service } = makeService();
      const actor = { id: 99 };
      await expect(
        service.getOverrides(7, noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.putOverrides(7, [], noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getMembers(7, noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.putMembers(7, [], noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getSettings(7, noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.putSettings(7, 3, noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.addSkip(7, '2999-01-01', noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.removeSkip(7, '2999-01-01', noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.listSkips(7, noAccess, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows scope, the co-leader and the leader', async () => {
      const { service } = makeService();
      await expect(
        service.getMembers(7, scoped, { id: 99 }),
      ).resolves.toBeDefined();
      await expect(
        service.getMembers(7, noAccess, { id: 11 }),
      ).resolves.toBeDefined();
      await expect(
        service.getMembers(7, noAccess, { id: 10 }),
      ).resolves.toBeDefined();
    });
  });

  describe('getMembers', () => {
    it('unions leader, co-leader and members, drops inactive users and reports eligibility', async () => {
      const { service } = makeService({
        settings: [
          {
            userId: 1,
            eligible: false,
            reason: 'prefere nao participar',
            excludedTemplateIds: [1],
          },
        ],
      });
      const members = await service.getMembers(7, unrestricted, { id: 1 });
      expect(members.map((m) => m.user_id).sort()).toEqual([1, 10, 11]);
      const bobRow = members.find((m) => m.user_id === 1);
      expect(bobRow).toMatchObject({
        eligible: false,
        eligibility_source: 'manual',
        reason: 'prefere nao participar',
        grandfathered: false,
        excluded_template_ids: [1],
        present_count: 1,
        min_present_meetings: 3,
      });
      const leaderRow = members.find((m) => m.user_id === 10);
      expect(leaderRow).toMatchObject({
        eligible: true,
        eligibility_source: 'leader',
        is_leader: true,
      });
    });

    it('flags grandfathered members from the column and returns the real leader note untouched', async () => {
      const { service } = makeService({
        settings: [
          {
            userId: 1,
            eligible: true,
            grandfathered: true,
            reason: 'nota real do líder',
            excludedTemplateIds: null,
          },
        ],
      });
      const members = await service.getMembers(7, unrestricted, { id: 1 });
      expect(members.find((m) => m.user_id === 1)).toMatchObject({
        eligible: true,
        eligibility_source: 'manual',
        grandfathered: true,
        reason: 'nota real do líder',
      });
      expect(
        members.filter((m) => m.user_id !== 1).every((m) => !m.grandfathered),
      ).toBe(true);
    });

    it('exposes joined_at from user_life_groups and null for leaders outside the join table', async () => {
      const { service } = makeService({
        joinedRows: [{ user_id: 1, joined_at: '2026-05-01T12:00:00.000Z' }],
      });
      const members = await service.getMembers(7, unrestricted, { id: 1 });
      expect(members.find((m) => m.user_id === 1)?.joined_at).toBe(
        '2026-05-01T12:00:00.000Z',
      );
      expect(members.find((m) => m.user_id === 10)?.joined_at).toBeNull();
    });

    it('marks a new member below the threshold as pending', async () => {
      const { service } = makeService();
      const members = await service.getMembers(7, unrestricted, { id: 1 });
      expect(members.find((m) => m.user_id === 1)).toMatchObject({
        eligible: false,
        eligibility_source: 'pending',
      });
    });
  });

  describe('putMembers', () => {
    it('rejects users that are not in the group', async () => {
      const { service, em } = makeService();
      await expect(
        service.putMembers(
          7,
          [{ userId: 555, eligible: false }],
          unrestricted,
          { id: 1 },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(em.save).not.toHaveBeenCalled();
    });

    it('requires eligible unless reset_to_automatic is set', async () => {
      const { service } = makeService();
      await expect(
        service.putMembers(7, [{ userId: 1 }], unrestricted, { id: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a setting, records the actor and normalizes blank values', async () => {
      const { service, em } = makeService();
      await service.putMembers(
        7,
        [
          {
            userId: 1,
            eligible: false,
            reason: '   ',
            excludedTemplateIds: [],
          },
        ],
        unrestricted,
        { id: 42 },
      );
      expect(em.save).toHaveBeenCalledWith([
        expect.objectContaining({
          lifeGroupId: 7,
          userId: 1,
          eligible: false,
          reason: null,
          excludedTemplateIds: null,
          updatedBy: 42,
        }),
      ]);
    });

    it('preserves the grandfathered flag when the leader edits note, exclusions or eligible', async () => {
      const existing = {
        userId: 1,
        lifeGroupId: 7,
        eligible: true,
        grandfathered: true,
        reason: null,
        excludedTemplateIds: null,
      };
      const { service, em } = makeService({ settings: [existing] });
      // Toggle off then back on, with a note and an exclusion: still flagged.
      await service.putMembers(
        7,
        [
          {
            userId: 1,
            eligible: false,
            reason: 'ferias',
            excludedTemplateIds: [1],
          },
        ],
        unrestricted,
        { id: 42 },
      );
      await service.putMembers(
        7,
        [{ userId: 1, eligible: true, reason: '' }],
        unrestricted,
        { id: 42 },
      );
      for (const call of em.save.mock.calls as [Record<string, unknown>[]][]) {
        expect(call[0][0]).toMatchObject({ userId: 1, grandfathered: true });
      }
      expect(existing).toMatchObject({
        eligible: true,
        grandfathered: true,
        reason: null,
      });
    });

    it('creates new settings as not grandfathered', async () => {
      const { service, em } = makeService();
      await service.putMembers(
        7,
        [{ userId: 1, eligible: true }],
        unrestricted,
        { id: 42 },
      );
      expect(em.save).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 1, grandfathered: false }),
      ]);
    });

    it('rejects reset_to_automatic on a grandfathered member and changes nothing', async () => {
      const existing = {
        userId: 1,
        lifeGroupId: 7,
        eligible: true,
        grandfathered: true,
      };
      const { service, em } = makeService({ settings: [existing] });
      await expect(
        service.putMembers(
          7,
          [
            { userId: 11, eligible: false },
            { userId: 1, resetToAutomatic: true },
          ],
          unrestricted,
          { id: 1 },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(em.remove).not.toHaveBeenCalled();
      expect(em.save).not.toHaveBeenCalled();
    });

    it('rejects unknown template exclusions', async () => {
      const { service } = makeService();
      await expect(
        service.putMembers(
          7,
          [{ userId: 1, eligible: true, excludedTemplateIds: [999] }],
          unrestricted,
          { id: 1 },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes the explicit row on reset_to_automatic', async () => {
      const existing = { userId: 1, lifeGroupId: 7, eligible: true };
      const { service, em } = makeService({ settings: [existing] });
      await service.putMembers(
        7,
        [{ userId: 1, resetToAutomatic: true }],
        unrestricted,
        { id: 1 },
      );
      expect(em.remove).toHaveBeenCalledWith([existing]);
    });
  });

  describe('overrides', () => {
    it('lists active templates with the group override applied', async () => {
      const { service } = makeService({
        overrides: [
          { templateId: 1, isEnabled: false, guidanceOverride: 'custom' },
        ],
      });
      const result = await service.getOverrides(7, unrestricted, { id: 1 });
      expect(result).toEqual([
        {
          template_id: 1,
          name: 'Palavra',
          description: 'd',
          template_guidance: 'g',
          is_enabled: false,
          guidance_override: 'custom',
        },
      ]);
    });

    it('rejects overrides for unknown templates', async () => {
      const { service } = makeService();
      await expect(
        service.putOverrides(
          7,
          [{ templateId: 999, isEnabled: true }],
          unrestricted,
          { id: 1 },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('settings and skips', () => {
    it('defaults min_present_meetings to 3', async () => {
      const { service } = makeService();
      await expect(
        service.getSettings(7, unrestricted, { id: 1 }),
      ).resolves.toEqual({ min_present_meetings: 3 });
    });

    it('addSkip validates the date and inserts idempotently', async () => {
      const { service, insertQb } = makeService();
      await expect(
        service.addSkip(7, '2026-02-31', unrestricted, { id: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await service.addSkip(7, '2999-01-01', unrestricted, { id: 5 });
      expect(insertQb.orIgnore).toHaveBeenCalled();
      expect(insertQb.values).toHaveBeenCalledWith({
        lifeGroupId: 7,
        meetingDate: '2999-01-01',
        createdBy: 5,
      });
    });
  });
});
