import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { LifeGroupTaskAssignmentsService } from './life-group-task-assignments.service';
import { LifeGroupTaskRosterService } from './life-group-task-roster.service';
import { LifeGroupTaskNotifier } from './life-group-task-notifier';
import { LifeGroupTaskAssignment } from './entities/life-group-task-assignment.entity';
import { LifeGroupTaskMemberSetting } from './entities/life-group-task-member-setting.entity';
import { LifeGroupTaskOverride } from './entities/life-group-task-override.entity';
import { LifeGroupTaskSkip } from './entities/life-group-task-skip.entity';
import { LifeGroupTaskTemplate } from './entities/life-group-task-template.entity';

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

const leader = { id: 10, name: 'Lia Leader', status: 'active' };
const coLeader = { id: 11, name: 'Caio Co', status: 'active' };
const bob = { id: 1, name: 'Bob', status: 'active' };
const alice = { id: 2, name: 'Alice', status: 'active' };

function makeGroup(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 7,
    meetingDay: null,
    leader,
    coLeader,
    users: [bob, alice],
    ...overrides,
  } as unknown as LifeGroup;
}

const palavra = {
  id: 1,
  name: 'Palavra',
  description: 'desc palavra',
  guidance: 'guia palavra',
  sortOrder: 0,
  isActive: true,
};
const oferta = {
  id: 2,
  name: 'Oferta',
  description: 'desc oferta',
  guidance: 'guia oferta',
  sortOrder: 1,
  isActive: true,
};

interface World {
  group: LifeGroup;
  templates: unknown[];
  overrides: unknown[];
  settings: unknown[];
  skip: unknown;
  // Successive results of em.find(LifeGroupTaskAssignment); last one repeats.
  assignmentFinds: unknown[][];
  assignmentOne: Record<string, unknown> | null;
  presentRows: unknown[];
  historyRows: unknown[];
}

function makeWorld(partial: Partial<World> = {}): World {
  return {
    group: makeGroup(),
    templates: [palavra, oferta],
    overrides: [],
    settings: [],
    skip: null,
    assignmentFinds: [[]],
    assignmentOne: null,
    presentRows: [{ user_id: 1, present_count: 3 }],
    historyRows: [],
    ...partial,
  };
}

function makeService(world: World) {
  const insertQb = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  let assignmentFindCalls = 0;
  const em = {
    findOne: jest.fn((entity: unknown) => {
      if (entity === LifeGroup) return Promise.resolve(world.group);
      if (entity === LifeGroupTaskSkip) return Promise.resolve(world.skip);
      if (entity === LifeGroupTaskAssignment) {
        return Promise.resolve(world.assignmentOne);
      }
      return Promise.resolve(null);
    }),
    find: jest.fn((entity: unknown) => {
      if (entity === LifeGroupTaskTemplate) {
        return Promise.resolve(world.templates);
      }
      if (entity === LifeGroupTaskOverride) {
        return Promise.resolve(world.overrides);
      }
      if (entity === LifeGroupTaskMemberSetting) {
        return Promise.resolve(world.settings);
      }
      if (entity === LifeGroupTaskAssignment) {
        const i = Math.min(
          assignmentFindCalls,
          world.assignmentFinds.length - 1,
        );
        assignmentFindCalls++;
        return Promise.resolve(world.assignmentFinds[i]);
      }
      return Promise.resolve([]);
    }),
    query: jest.fn((sql: string) =>
      Promise.resolve(
        sql.includes('life_group_attendance_entries')
          ? world.presentRows
          : world.historyRows,
      ),
    ),
    update: jest.fn(
      (
        _entity: unknown,
        _criteria: unknown,
        patch: Record<string, unknown>,
      ) => {
        if (world.assignmentOne) Object.assign(world.assignmentOne, patch);
        return Promise.resolve({ affected: 1 });
      },
    ),
    createQueryBuilder: jest.fn(() => insertQb),
  };
  const notifier = {
    notifyReassigned: jest.fn().mockResolvedValue(undefined),
    notifyUnassignable: jest.fn().mockResolvedValue(undefined),
  };
  const roster = new LifeGroupTaskRosterService(em as unknown as EntityManager);
  const service = new LifeGroupTaskAssignmentsService(
    em as unknown as EntityManager,
    roster,
    notifier as unknown as LifeGroupTaskNotifier,
  );
  return { service, em, insertQb, notifier };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a-1',
    lifeGroupId: 7,
    templateId: 1,
    meetingDate: '2999-01-01',
    userId: 1,
    user: bob,
    taskName: 'Palavra',
    taskDescription: 'desc palavra',
    taskGuidance: 'guia palavra',
    status: 'assigned',
    source: 'auto',
    notifiedAt: null,
    remindedAt: null,
    ...overrides,
  };
}

describe('LifeGroupTaskAssignmentsService', () => {
  describe('authorization', () => {
    it('forbids a user with no scope who is neither leader nor co-leader', async () => {
      const { service, insertQb } = makeService(makeWorld());
      await expect(
        service.generate(7, '2999-01-01', noAccess, { id: 99 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(insertQb.execute).not.toHaveBeenCalled();
    });

    it('allows the co_leader_id fallback and the leader_id fallback', async () => {
      for (const id of [11, 10]) {
        const { service } = makeService(makeWorld());
        const result = await service.generate(7, '2999-01-01', noAccess, {
          id,
        });
        expect(result.meeting_date).toBe('2999-01-01');
      }
    });

    it('rejects a date that is not the group meeting weekday', async () => {
      const world = makeWorld({
        group: makeGroup({ meetingDay: 'Quarta-feira' }),
      });
      const { service } = makeService(world);
      // 2026-06-11 is a Thursday.
      await expect(
        service.generate(7, '2026-06-11', unrestricted, { id: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('defaults meeting_date to the next meeting and needs one without a fixed day', async () => {
      const world = makeWorld({
        group: makeGroup({ meetingDay: 'Quarta-feira' }),
      });
      const { service } = makeService(world);
      const result = await service.generate(7, undefined, unrestricted, {
        id: 1,
      });
      // The next Wednesday (today counts) is always a valid ISO date.
      expect(result.meeting_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const noDay = makeService(makeWorld());
      await expect(
        noDay.service.generate(7, undefined, unrestricted, { id: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('list and reroll also enforce access', async () => {
      const { service } = makeService(makeWorld());
      await expect(
        service.list(7, '2999-01-01', noAccess, { id: 99 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.reroll(7, 'a-1', noAccess, { id: 99 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.reassign(7, 'a-1', 1, noAccess, { id: 99 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('generate', () => {
    it('inserts with ON CONFLICT DO NOTHING and snapshots guidance with the group override', async () => {
      const world = makeWorld({
        overrides: [
          {
            templateId: 1,
            isEnabled: true,
            guidanceOverride: 'guia do grupo',
          },
        ],
        assignmentFinds: [
          [],
          [
            row({ id: 'a-1', templateId: 1, userId: 10, user: leader }),
            row({ id: 'a-2', templateId: 2, userId: 11, user: coLeader }),
          ],
        ],
      });
      const { service, insertQb } = makeService(world);

      const result = await service.generate(7, '2999-01-01', unrestricted, {
        id: 1,
      });

      expect(insertQb.orIgnore).toHaveBeenCalledTimes(1);
      const values = insertQb.values.mock.calls[0][0] as Record<
        string,
        unknown
      >[];
      expect(values).toHaveLength(2);
      const palavraRow = values.find((v) => v.templateId === 1);
      const ofertaRow = values.find((v) => v.templateId === 2);
      expect(palavraRow).toMatchObject({
        taskName: 'Palavra',
        taskDescription: 'desc palavra',
        taskGuidance: 'guia do grupo',
        status: 'assigned',
        source: 'auto',
        lifeGroupId: 7,
        meetingDate: '2999-01-01',
      });
      expect(ofertaRow).toMatchObject({ taskGuidance: 'guia oferta' });
      expect(result.assignments).toHaveLength(2);
      expect(result.unassigned_templates).toEqual([]);
    });

    it('skips templates the group disabled', async () => {
      const world = makeWorld({
        overrides: [{ templateId: 2, isEnabled: false }],
        assignmentFinds: [[], [row({ userId: 10, user: leader })]],
      });
      const { service, insertQb } = makeService(world);
      await service.generate(7, '2999-01-01', unrestricted, { id: 1 });
      const values = insertQb.values.mock.calls[0][0] as {
        templateId: number;
      }[];
      expect(values.map((v) => v.templateId)).toEqual([1]);
    });

    it('is idempotent: nothing is inserted or recomputed when every template already has a row', async () => {
      const existing = [
        row({ id: 'a-1', templateId: 1, userId: 1 }),
        row({ id: 'a-2', templateId: 2, userId: 10, user: leader }),
      ];
      const world = makeWorld({ assignmentFinds: [existing] });
      const { service, insertQb, em } = makeService(world);

      const result = await service.generate(7, '2999-01-01', unrestricted, {
        id: 1,
      });

      expect(insertQb.execute).not.toHaveBeenCalled();
      const sqls = (em.query.mock.calls as [string][]).map((c) => c[0]);
      expect(sqls.some((q) => q.includes('life_group_task_skips'))).toBe(false);
      expect(result.assignments.map((a) => a.id)).toEqual(['a-1', 'a-2']);
    });

    it('only fills the missing templates on a partial earlier run', async () => {
      const first = row({ id: 'a-1', templateId: 1, userId: 1 });
      const world = makeWorld({
        assignmentFinds: [
          [first],
          [first, row({ id: 'a-2', templateId: 2, userId: 10, user: leader })],
        ],
      });
      const { service, insertQb } = makeService(world);
      await service.generate(7, '2999-01-01', unrestricted, { id: 1 });
      const values = insertQb.values.mock.calls[0][0] as {
        templateId: number;
      }[];
      expect(values.map((v) => v.templateId)).toEqual([2]);
    });

    it('does nothing for a skipped date', async () => {
      const world = makeWorld({ skip: { id: 's-1' } });
      const { service, insertQb } = makeService(world);
      const result = await service.generate(7, '2999-01-01', unrestricted, {
        id: 1,
      });
      expect(result.skipped).toBe(true);
      expect(result.assignments).toEqual([]);
      expect(insertQb.execute).not.toHaveBeenCalled();
    });

    it('never assigns an ineligible member (new member below the present threshold)', async () => {
      const world = makeWorld({
        // Alice has 0 present entries -> pending/ineligible. Bob has 3.
        assignmentFinds: [[], []],
      });
      for (let i = 0; i < 20; i++) {
        const { service, insertQb } = makeService(world);
        await service.generate(7, '2999-01-01', unrestricted, { id: 1 });
        const values = insertQb.values.mock.calls[0][0] as {
          userId: number;
        }[];
        expect(values.some((v) => v.userId === alice.id)).toBe(false);
      }
    });

    it('honours an explicit eligible=false and per-template exclusions', async () => {
      const world = makeWorld({
        group: makeGroup({ users: [], coLeader: null }),
        settings: [{ userId: 10, eligible: true, excludedTemplateIds: [1] }],
        assignmentFinds: [
          [],
          [row({ id: 'a-9', templateId: 2, userId: 10, user: leader })],
        ],
      });
      const { service, insertQb, notifier } = makeService(world);
      const result = await service.generate(7, '2999-01-01', unrestricted, {
        id: 1,
      });
      // Only the leader is eligible and is excluded from template 1.
      const values = insertQb.values.mock.calls[0][0] as {
        templateId: number;
        userId: number;
      }[];
      expect(values).toEqual([
        expect.objectContaining({ templateId: 2, userId: 10 }),
      ]);
      expect(result.unassignable_template_ids).toEqual([1]);
      expect(result.unassigned_templates).toEqual([
        { template_id: 1, name: 'Palavra' },
      ]);
      expect(notifier.notifyUnassignable).toHaveBeenCalledWith({
        lifeGroupId: 7,
        meetingDate: '2999-01-01',
        taskNames: ['Palavra'],
      });
    });

    it('leaves every task unassigned and notifies when nobody is eligible', async () => {
      const world = makeWorld({
        group: makeGroup({ users: [], coLeader: null }),
        settings: [{ userId: 10, eligible: false, excludedTemplateIds: null }],
        assignmentFinds: [[], []],
      });
      const { service, insertQb, notifier } = makeService(world);
      await service.generate(7, '2999-01-01', unrestricted, { id: 1 });
      expect(insertQb.execute).not.toHaveBeenCalled();
      expect(notifier.notifyUnassignable).toHaveBeenCalledWith(
        expect.objectContaining({ taskNames: ['Palavra', 'Oferta'] }),
      );
    });

    it('prefers members with the lowest historical count (skipped dates are excluded in SQL)', async () => {
      const world = makeWorld({
        group: makeGroup({ users: [bob], coLeader: null }),
        templates: [palavra],
        presentRows: [{ user_id: 1, present_count: 5 }],
        // Leader (10) already did 3 tasks, Bob none.
        historyRows: [{ user_id: 10, template_id: 1, n: 3 }],
        assignmentFinds: [[], []],
      });
      const { service, insertQb, em } = makeService(world);
      await service.generate(7, '2999-01-01', unrestricted, { id: 1 });
      const values = insertQb.values.mock.calls[0][0] as { userId: number }[];
      expect(values[0].userId).toBe(1);
      const historySql = (em.query.mock.calls as [string][])
        .map((c) => c[0])
        .find((sql) => sql.includes('life_group_task_skips'));
      expect(historySql).toContain("a.status <> 'declined'");
    });
  });

  describe('reroll', () => {
    function rerollWorld() {
      const current = row({ id: 'a-1', templateId: 1, userId: 1 });
      const sibling = row({
        id: 'a-2',
        templateId: 2,
        userId: 10,
        user: leader,
      });
      return makeWorld({
        // Bob(1), leader(10), co-leader(11) eligible; Alice(2) pending.
        assignmentOne: current,
        assignmentFinds: [[current, sibling]],
      });
    }

    it('picks another eligible member, never the current assignee or an ineligible one', async () => {
      const world = rerollWorld();
      const { service, em, notifier } = makeService(world);
      const result = await service.reroll(7, 'a-1', unrestricted, { id: 1 });

      // Co-leader (11) is the only eligible member without a task yet.
      expect(em.update).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        { id: 'a-1', userId: 1 },
        expect.objectContaining({
          userId: 11,
          source: 'reroll',
          status: 'assigned',
          notifiedAt: null,
          remindedAt: null,
        }),
      );
      expect(result.user_id).toBe(11);
      expect(notifier.notifyReassigned).toHaveBeenCalledWith(
        expect.objectContaining({ assignmentId: 'a-1', userId: 11 }),
        { previousUserId: 1, reason: 'reroll' },
      );
    });

    it('respects per-template exclusions', async () => {
      const world = rerollWorld();
      world.settings = [
        { userId: 11, eligible: true, excludedTemplateIds: [1] },
      ];
      const { service, em } = makeService(world);
      await service.reroll(7, 'a-1', unrestricted, { id: 1 });
      // 11 excluded for template 1, 1 is current -> only 10 remains.
      expect(em.update).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        expect.anything(),
        expect.objectContaining({ userId: 10 }),
      );
    });

    it('conflicts when no other eligible member exists', async () => {
      const world = rerollWorld();
      world.group = makeGroup({ users: [bob], coLeader: null });
      world.settings = [{ userId: 10, eligible: false }];
      const { service, notifier } = makeService(world);
      await expect(
        service.reroll(7, 'a-1', unrestricted, { id: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(notifier.notifyReassigned).not.toHaveBeenCalled();
    });

    it('404s for an assignment outside the group', async () => {
      const world = rerollWorld();
      world.assignmentOne = null;
      const { service } = makeService(world);
      await expect(
        service.reroll(7, 'nope', unrestricted, { id: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reassign', () => {
    it('rejects a user who is not an active member of the group', async () => {
      const world = makeWorld({ assignmentOne: row() });
      const { service } = makeService(world);
      await expect(
        service.reassign(7, 'a-1', 555, unrestricted, { id: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('moves the task with source=manual and notifies', async () => {
      const world = makeWorld({ assignmentOne: row() });
      const { service, em, notifier } = makeService(world);
      await service.reassign(7, 'a-1', 11, unrestricted, { id: 1 });
      expect(em.update).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        { id: 'a-1', userId: 1 },
        expect.objectContaining({ userId: 11, source: 'manual' }),
      );
      expect(notifier.notifyReassigned).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 11 }),
        { previousUserId: 1, reason: 'manual' },
      );
    });
  });

  describe('decline', () => {
    it('re-rolls to another eligible member excluding the decliner, without revealing who', async () => {
      const current = row({ id: 'a-1', templateId: 1, userId: 1 });
      const sibling = row({
        id: 'a-2',
        templateId: 2,
        userId: 10,
        user: leader,
      });
      const world = makeWorld({
        assignmentOne: current,
        assignmentFinds: [[current, sibling]],
      });
      const { service, em, notifier } = makeService(world);

      const result = await service.decline('a-1', { id: 1 });

      expect(em.findOne).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        expect.objectContaining({ where: { id: 'a-1', userId: 1 } }),
      );
      expect(em.update).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        { id: 'a-1', userId: 1 },
        expect.objectContaining({ userId: 11, source: 'reroll' }),
      );
      expect(notifier.notifyReassigned).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 11 }),
        { previousUserId: 1, reason: 'decline' },
      );
      expect(result).toEqual({
        id: 'a-1',
        status: 'declined',
        reassigned: true,
      });
    });

    it('keeps the task declined and notifies the leader when nobody else qualifies', async () => {
      const current = row({ id: 'a-1', userId: 10, user: leader });
      const world = makeWorld({
        group: makeGroup({ users: [], coLeader: null }),
        assignmentOne: current,
        assignmentFinds: [[current]],
      });
      const { service, em, notifier } = makeService(world);

      const result = await service.decline('a-1', { id: 10 });

      expect(em.update).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        { id: 'a-1', userId: 10 },
        { status: 'declined' },
      );
      expect(notifier.notifyUnassignable).toHaveBeenCalledWith({
        lifeGroupId: 7,
        meetingDate: '2999-01-01',
        taskNames: ['Palavra'],
      });
      expect(result.reassigned).toBe(false);
    });

    it('404s when the assignment belongs to someone else', async () => {
      const world = makeWorld({ assignmentOne: null });
      const { service } = makeService(world);
      await expect(
        service.decline('a-1', { id: 5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('conflicts when already declined and rejects past meetings', async () => {
      const declined = makeWorld({
        assignmentOne: row({ status: 'declined' }),
      });
      await expect(
        makeService(declined).service.decline('a-1', { id: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);

      const past = makeWorld({
        assignmentOne: row({ meetingDate: '2000-01-01' }),
      });
      await expect(
        makeService(past).service.decline('a-1', { id: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('member views (no note leakage)', () => {
    const memberKeys = [
      'id',
      'life_group_id',
      'life_group_name',
      'meeting_date',
      'status',
      'task_description',
      'task_guidance',
      'task_name',
    ];

    it('getMine is scoped to the requesting user and exposes only guide fields', async () => {
      const world = makeWorld({
        // A leader note exists for this member; it must never be returned.
        settings: [
          {
            userId: 1,
            eligible: true,
            reason: 'SEGREDO do lider',
            excludedTemplateIds: [2],
          },
        ],
        assignmentOne: row({ lifeGroup: { id: 7, name: 'Life Norte' } }),
      });
      const { service, em } = makeService(world);

      const result = await service.getMine('a-1', { id: 1 });

      expect(em.findOne).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        expect.objectContaining({ where: { id: 'a-1', userId: 1 } }),
      );
      expect(Object.keys(result).sort()).toEqual(memberKeys);
      expect(JSON.stringify(result)).not.toContain('SEGREDO');
      expect(result.life_group_name).toBe('Life Norte');
    });

    it('getMine 404s for another member task', async () => {
      const { service } = makeService(makeWorld({ assignmentOne: null }));
      await expect(
        service.getMine('a-1', { id: 99 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('listMine only returns guide fields for the requesting user', async () => {
      const world = makeWorld({
        settings: [{ userId: 1, eligible: true, reason: 'SEGREDO' }],
        assignmentFinds: [[row({ lifeGroup: { id: 7, name: 'Life Norte' } })]],
      });
      const { service, em } = makeService(world);
      const result = await service.listMine({ id: 1 });
      const calls = em.find.mock.calls as unknown as [
        unknown,
        { where: { userId: number } },
      ][];
      const call = calls.find(([entity]) => entity === LifeGroupTaskAssignment);
      expect(call?.[1].where.userId).toBe(1);
      expect(result).toHaveLength(1);
      expect(Object.keys(result[0]).sort()).toEqual(memberKeys);
      expect(JSON.stringify(result)).not.toContain('SEGREDO');
    });
  });
});
