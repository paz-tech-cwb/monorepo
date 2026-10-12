import { EntityManager } from 'typeorm';
import { LifeGroupTasksReminderEvaluator } from './life-group-tasks.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';
import { LifeGroupTaskAssignmentsService } from '../../life-group-tasks/life-group-task-assignments.service';
import { LifeGroupTaskNotificationsService } from '../../life-group-tasks/life-group-task-notifications.service';
import { LifeGroupTaskAssignment } from '../../life-group-tasks/entities/life-group-task-assignment.entity';
import { LifeGroupTaskSkip } from '../../life-group-tasks/entities/life-group-task-skip.entity';

interface MockQueryBuilder {
  where: jest.Mock<MockQueryBuilder, unknown[]>;
  andWhere: jest.Mock<MockQueryBuilder, unknown[]>;
  getMany: jest.Mock<Promise<unknown[]>, []>;
}

const asError = (e: unknown): Error =>
  e instanceof Error ? e : Object.assign(new Error('mock error'), e as object);

describe('LifeGroupTasksReminderEvaluator', () => {
  const rule = {
    id: 5,
    type: 'life_group_tasks',
    enabled: true,
    config: {
      days_before_meeting: [3, 1],
      hour: 9,
      title: 'Sua tarefa',
      message: 'Você foi sorteado para {task}',
      reminder_title: 'Lembrete',
      reminder_message: 'Não esqueça de {task}',
    },
  } as ReminderRule;

  // 2026-06-10 is a Wednesday in America/Sao_Paulo (UTC-03:00).
  const sundayNine = new Date('2026-06-07T09:00:00-03:00'); // 3 days before
  const tuesdayNine = new Date('2026-06-09T09:00:00-03:00'); // 1 day before

  const group = {
    id: 7,
    meetingDay: 'Quarta-feira',
    meetingTime: '19:00:00',
  };

  const bob = { id: 1, name: 'Bob' };
  const ana = { id: 2, name: 'Ana' };

  function assignment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'a-1',
      lifeGroupId: 7,
      meetingDate: '2026-06-10',
      userId: 1,
      user: bob,
      taskName: 'Palavra',
      status: 'assigned',
      notifiedAt: null,
      remindedAt: null,
      ...overrides,
    };
  }

  interface Setup {
    groups?: unknown[];
    skip?: unknown;
    dedupe?: unknown;
    pendingReminders?: unknown[];
    existingAssignments?: number;
    generated?: unknown[];
    generatedSkipped?: boolean;
    insertError?: unknown;
    notifyError?: unknown;
  }

  function setup(opts: Setup = {}) {
    const qb: MockQueryBuilder = {
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      getMany: jest
        .fn<Promise<unknown[]>, []>()
        .mockResolvedValue(opts.groups ?? [group]),
    };
    const em = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn((entity: unknown) => {
        if (entity === LifeGroupTaskSkip) {
          return Promise.resolve(opts.skip ?? null);
        }
        if (entity === ReminderDispatchLog) {
          return Promise.resolve(opts.dedupe ?? null);
        }
        return Promise.resolve(null);
      }),
      find: jest.fn((entity: unknown) =>
        Promise.resolve(
          entity === LifeGroupTaskAssignment
            ? (opts.pendingReminders ?? [])
            : [],
        ),
      ),
      count: jest.fn(() => Promise.resolve(opts.existingAssignments ?? 1)),
      insert: jest.fn(() =>
        opts.insertError
          ? Promise.reject(asError(opts.insertError))
          : Promise.resolve(undefined),
      ),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const tasks = {
      generateForMeeting: jest.fn(() =>
        Promise.resolve({
          meetingDate: '2026-06-10',
          skipped: opts.generatedSkipped ?? false,
          assignments: opts.generated ?? [assignment()],
          created: [],
          unassignableTemplateIds: [],
        }),
      ),
    };
    const notifications = {
      notifyAssignee: jest.fn<Promise<undefined>, unknown[]>(() =>
        opts.notifyError
          ? Promise.reject(asError(opts.notifyError))
          : Promise.resolve(undefined),
      ),
      remindAssignee: jest.fn<Promise<undefined>, unknown[]>(() =>
        opts.notifyError
          ? Promise.reject(asError(opts.notifyError))
          : Promise.resolve(undefined),
      ),
    };
    const evaluator = new LifeGroupTasksReminderEvaluator(
      em as unknown as EntityManager,
      tasks as unknown as LifeGroupTaskAssignmentsService,
      notifications as unknown as LifeGroupTaskNotificationsService,
    );
    return { evaluator, em, tasks, notifications };
  }

  it('largest offset generates and notifies only unnotified assigned members', async () => {
    const { evaluator, tasks, notifications, em } = setup({
      generated: [
        assignment({ id: 'a-1', user: bob }),
        assignment({ id: 'a-2', userId: 2, user: ana, notifiedAt: new Date() }),
        assignment({ id: 'a-3', status: 'declined' }),
      ],
    });
    await evaluator.run(rule, sundayNine);

    expect(tasks.generateForMeeting).toHaveBeenCalledWith(7, '2026-06-10');
    expect(notifications.notifyAssignee).toHaveBeenCalledTimes(1);
    expect(notifications.notifyAssignee).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a-1' }),
      bob,
      'Sua tarefa',
      'Você foi sorteado para {task}',
    );
    expect(em.insert).toHaveBeenCalledWith(ReminderDispatchLog, {
      ruleType: 'life_group_tasks',
      dedupeKey: 'life_group_tasks:7:2026-06-10:d3',
    });
  });

  it('smaller offset only reminds already-assigned members and never generates', async () => {
    const { evaluator, tasks, notifications, em } = setup({
      pendingReminders: [assignment()],
    });
    await evaluator.run(rule, tuesdayNine);

    expect(tasks.generateForMeeting).not.toHaveBeenCalled();
    expect(notifications.notifyAssignee).not.toHaveBeenCalled();
    expect(notifications.remindAssignee).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a-1' }),
      bob,
      'Lembrete',
      'Não esqueça de {task}',
    );
    const findCall = (
      em.find.mock.calls as unknown as [
        unknown,
        { where: Record<string, unknown> },
      ][]
    )[0];
    expect(findCall[1].where).toMatchObject({
      lifeGroupId: 7,
      meetingDate: '2026-06-10',
      status: 'assigned',
    });
    expect(em.insert).toHaveBeenCalledWith(ReminderDispatchLog, {
      ruleType: 'life_group_tasks',
      dedupeKey: 'life_group_tasks:7:2026-06-10:d1',
    });
  });

  it('late setup: a smaller offset generates and pushes when the meeting has no assignments at all', async () => {
    const { evaluator, tasks, notifications } = setup({
      pendingReminders: [],
      existingAssignments: 0,
      generated: [assignment()],
    });
    await evaluator.run(rule, tuesdayNine);

    expect(tasks.generateForMeeting).toHaveBeenCalledWith(7, '2026-06-10');
    expect(notifications.notifyAssignee).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a-1' }),
      bob,
      'Sua tarefa',
      'Você foi sorteado para {task}',
    );
    expect(notifications.remindAssignee).not.toHaveBeenCalled();
  });

  it('a smaller offset never generates when assignments already exist (leader rerolls/declines are kept)', async () => {
    const { evaluator, tasks } = setup({
      pendingReminders: [],
      existingAssignments: 2,
    });
    await evaluator.run(rule, tuesdayNine);
    expect(tasks.generateForMeeting).not.toHaveBeenCalled();
  });

  it('claims the dispatch key BEFORE generating or sending', async () => {
    const { evaluator, em, tasks, notifications } = setup();
    await evaluator.run(rule, sundayNine);
    const claimOrder = em.insert.mock.invocationCallOrder[0];
    expect(claimOrder).toBeLessThan(
      tasks.generateForMeeting.mock.invocationCallOrder[0],
    );
    expect(claimOrder).toBeLessThan(
      notifications.notifyAssignee.mock.invocationCallOrder[0],
    );
    expect(em.delete).not.toHaveBeenCalled();
  });

  it('releases the d1 claim when there is nobody to remind yet', async () => {
    const { evaluator, em, notifications } = setup({ pendingReminders: [] });
    await evaluator.run(rule, tuesdayNine);
    expect(notifications.remindAssignee).not.toHaveBeenCalled();
    expect(em.delete).toHaveBeenCalledWith(ReminderDispatchLog, {
      ruleType: 'life_group_tasks',
      dedupeKey: 'life_group_tasks:7:2026-06-10:d1',
    });
  });

  it('releases the claim when a send fails so the next tick retries', async () => {
    const { evaluator, em } = setup({ notifyError: new Error('fcm down') });
    await expect(evaluator.run(rule, sundayNine)).resolves.toBeUndefined();
    expect(em.delete).toHaveBeenCalledWith(ReminderDispatchLog, {
      ruleType: 'life_group_tasks',
      dedupeKey: 'life_group_tasks:7:2026-06-10:d3',
    });
  });

  it('releases the d1 claim when a reminder send fails', async () => {
    const { evaluator, em } = setup({
      pendingReminders: [assignment()],
      notifyError: new Error('fcm down'),
    });
    await evaluator.run(rule, tuesdayNine);
    expect(em.delete).toHaveBeenCalledWith(ReminderDispatchLog, {
      ruleType: 'life_group_tasks',
      dedupeKey: 'life_group_tasks:7:2026-06-10:d1',
    });
  });

  it('does nothing outside the configured hour', async () => {
    const { evaluator, tasks, em } = setup();
    await evaluator.run(rule, new Date('2026-06-07T10:00:00-03:00'));
    expect(tasks.generateForMeeting).not.toHaveBeenCalled();
    expect(em.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('does nothing when no configured offset lands on the group weekday', async () => {
    const { evaluator, tasks, notifications } = setup();
    // Monday: +3 = Thursday, +1 = Tuesday; the group meets on Wednesday.
    await evaluator.run(rule, new Date('2026-06-08T09:00:00-03:00'));
    expect(tasks.generateForMeeting).not.toHaveBeenCalled();
    expect(notifications.remindAssignee).not.toHaveBeenCalled();
  });

  it('skips groups without a fixed meeting day or time', async () => {
    const { evaluator, tasks } = setup({
      groups: [
        { ...group, meetingDay: 'Sem dia fixo' },
        { ...group, id: 8, meetingTime: null },
      ],
    });
    await evaluator.run(rule, sundayNine);
    expect(tasks.generateForMeeting).not.toHaveBeenCalled();
  });

  it('skips a meeting date the leader marked as skipped', async () => {
    const { evaluator, tasks, notifications } = setup({ skip: { id: 's' } });
    await evaluator.run(rule, sundayNine);
    expect(tasks.generateForMeeting).not.toHaveBeenCalled();
    expect(notifications.notifyAssignee).not.toHaveBeenCalled();
  });

  it('does not re-send when the dedupe row already exists', async () => {
    const { evaluator, tasks, notifications } = setup({ dedupe: { id: 1 } });
    await evaluator.run(rule, sundayNine);
    expect(tasks.generateForMeeting).not.toHaveBeenCalled();
    expect(notifications.notifyAssignee).not.toHaveBeenCalled();
  });

  it('notifies nobody when generation reports a skipped date', async () => {
    const { evaluator, notifications, em } = setup({ generatedSkipped: true });
    await evaluator.run(rule, sundayNine);
    expect(notifications.notifyAssignee).not.toHaveBeenCalled();
    // The claim is released again: nothing was sent for a skipped date.
    expect(em.delete).toHaveBeenCalledTimes(1);
  });

  it('skips silently when another instance already holds the claim (23505)', async () => {
    const { evaluator, tasks, notifications, em } = setup({
      insertError: { code: '23505' },
    });
    await expect(evaluator.run(rule, sundayNine)).resolves.toBeUndefined();
    expect(tasks.generateForMeeting).not.toHaveBeenCalled();
    expect(notifications.notifyAssignee).not.toHaveBeenCalled();
    expect(em.delete).not.toHaveBeenCalled();
  });

  it('falls back to default texts when the stored config lacks reminder_*', async () => {
    const legacy = {
      ...rule,
      config: {
        days_before_meeting: [3, 1],
        hour: 9,
        title: 'T',
        message: 'M',
      },
    } as ReminderRule;
    const { evaluator, notifications } = setup({
      pendingReminders: [assignment()],
    });
    await evaluator.run(legacy, tuesdayNine);
    const call = notifications.remindAssignee.mock.calls[0];
    expect(call[2]).toBe('Lembrete: sua tarefa no Life Group');
    expect(typeof call[3]).toBe('string');
  });

  it('keeps processing other groups when one group fails', async () => {
    const { evaluator, tasks, notifications } = setup({
      groups: [group, { ...group, id: 8 }],
    });
    tasks.generateForMeeting
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        meetingDate: '2026-06-10',
        skipped: false,
        assignments: [assignment({ lifeGroupId: 8 })],
        created: [],
        unassignableTemplateIds: [],
      });
    await evaluator.run(rule, sundayNine);
    expect(tasks.generateForMeeting).toHaveBeenCalledTimes(2);
    expect(notifications.notifyAssignee).toHaveBeenCalledTimes(1);
  });

  describe('per-assignment failure handling (largest offset)', () => {
    const three = [
      assignment({ id: 'a-1', user: bob }),
      assignment({ id: 'a-2', userId: 2, user: ana }),
      assignment({ id: 'a-3', userId: 3, user: { id: 3, name: 'Cy' } }),
    ];

    it('one assignment throwing does not stop the others and the group claim is kept', async () => {
      const { evaluator, notifications, em } = setup({ generated: three });
      notifications.notifyAssignee.mockImplementation((a: unknown) =>
        (a as { id: string }).id === 'a-2'
          ? Promise.reject(new Error('fcm'))
          : Promise.resolve(undefined),
      );
      await expect(evaluator.run(rule, sundayNine)).resolves.toBeUndefined();
      expect(notifications.notifyAssignee).toHaveBeenCalledTimes(3);
      // At least one went out: the d3 dispatch row stays (no release).
      expect(em.delete).not.toHaveBeenCalled();
    });

    it('releases the group claim only when every attempted send failed', async () => {
      const { evaluator, notifications, em } = setup({ generated: three });
      notifications.notifyAssignee.mockRejectedValue(new Error('fcm'));
      await evaluator.run(rule, sundayNine);
      expect(notifications.notifyAssignee).toHaveBeenCalledTimes(3);
      expect(em.delete).toHaveBeenCalledWith(ReminderDispatchLog, {
        ruleType: 'life_group_tasks',
        dedupeKey: 'life_group_tasks:7:2026-06-10:d3',
      });
    });

    it('keeps the group claim when nothing is pending (all already notified)', async () => {
      const { evaluator, notifications, em } = setup({
        generated: [assignment({ notifiedAt: new Date() })],
      });
      await evaluator.run(rule, sundayNine);
      expect(notifications.notifyAssignee).not.toHaveBeenCalled();
      expect(em.delete).not.toHaveBeenCalled();
    });

    it('smaller offset: one reminder throwing does not stop the others', async () => {
      const { evaluator, notifications, em } = setup({
        pendingReminders: three,
      });
      notifications.remindAssignee.mockImplementation((a: unknown) =>
        (a as { id: string }).id === 'a-1'
          ? Promise.reject(new Error('fcm'))
          : Promise.resolve(undefined),
      );
      await evaluator.run(rule, tuesdayNine);
      expect(notifications.remindAssignee).toHaveBeenCalledTimes(3);
      expect(em.delete).not.toHaveBeenCalled();
    });
  });
});
