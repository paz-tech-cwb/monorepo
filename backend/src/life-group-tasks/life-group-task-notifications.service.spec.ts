import { EntityManager } from 'typeorm';
import {
  dateKeyOf,
  shiftDays,
  zonedParts,
} from '../life-group-attendance/meeting-day.util';
import { ReminderRule } from '../reminders/entities/reminder-rule.entity';
import {
  LifeGroupTaskNotificationsService,
  renderTaskMessage,
  taskDeepLink,
} from './life-group-task-notifications.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { User } from '../users/entities/user.entity';
import { ReminderDispatchLog } from '../reminders/entities/reminder-dispatch-log.entity';
import { LifeGroupTaskAssignment } from './entities/life-group-task-assignment.entity';

const leader = { id: 10, name: 'Lia' };
const coLeader = { id: 11, name: 'Caio' };
const bob = { id: 1, name: 'Bob' };
const ana = { id: 2, name: 'Ana' };

function makeService(
  opts: {
    group?: unknown;
    claimed?: boolean;
    insertError?: unknown;
    rule?: unknown;
    sendError?: unknown;
  } = {},
) {
  const users = new Map<number, unknown>([
    [1, bob],
    [2, ana],
  ]);
  const em = {
    findOne: jest.fn((entity: unknown, options: { where: { id?: number } }) => {
      if (entity === User) {
        return Promise.resolve(users.get(options.where.id as number));
      }
      if (entity === LifeGroup) {
        return Promise.resolve(opts.group ?? { id: 7, leader, coLeader });
      }
      if (entity === ReminderRule) {
        return Promise.resolve(opts.rule ?? null);
      }
      return Promise.resolve(null);
    }),
    find: jest.fn((entity: unknown) =>
      Promise.resolve(entity === User ? [bob, ana] : []),
    ),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: jest.fn((value: unknown) =>
      Promise.resolve({ id: 99, ...(value as object) }),
    ),
    // Conditional UPDATE ... WHERE col IS NULL: affected=0 => lost the claim.
    update: jest.fn<
      Promise<{ affected: number }>,
      [unknown, Record<string, unknown>, unknown?]
    >((_entity, criteria) =>
      Promise.resolve({
        affected:
          opts.claimed === false && Object.keys(criteria).length > 1 ? 0 : 1,
      }),
    ),
    insert: jest.fn(() =>
      opts.insertError
        ? Promise.reject(asError(opts.insertError))
        : Promise.resolve(undefined),
    ),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const dispatch = {
    dispatch: jest.fn<Promise<void>, unknown[]>(() =>
      opts.sendError
        ? Promise.reject(asError(opts.sendError))
        : Promise.resolve(),
    ),
  };
  const service = new LifeGroupTaskNotificationsService(
    em as unknown as EntityManager,
    dispatch as unknown as NotificationDispatchService,
  );
  return { service, em, dispatch };
}

const asError = (e: unknown): Error =>
  e instanceof Error ? e : Object.assign(new Error('mock error'), e as object);

const notice = {
  assignmentId: 'a-1',
  userId: 2,
  lifeGroupId: 7,
  meetingDate: '2026-06-10',
  taskName: 'Palavra',
};

describe('LifeGroupTaskNotificationsService', () => {
  it('builds deep links and renders the {task} placeholder', () => {
    expect(taskDeepLink('abc')).toBe('paz://tarefa/abc');
    expect(renderTaskMessage('Tarefa: {task}!', 'Oferta')).toBe(
      'Tarefa: Oferta!',
    );
    expect(renderTaskMessage('Sem placeholder', 'Oferta')).toBe(
      'Sem placeholder',
    );
  });

  it('notifyAssignee pushes life_group_task with the tarefa deep link and marks notified_at', async () => {
    const { service, em, dispatch } = makeService();
    await service.notifyAssignee(
      { id: 'a-1', taskName: 'Palavra' } as LifeGroupTaskAssignment,
      bob as unknown as User,
      'Título',
      'Você ficou com {task}',
    );
    const saved = em.save.mock.calls[0][0] as Record<string, unknown>;
    expect(saved).toMatchObject({
      title: 'Título',
      message: 'Você ficou com Palavra',
      deepLink: 'paz://tarefa/a-1',
      category: 'life_group_task',
      channels: ['push'],
      origin: 'automatic',
      segment: { type: 'filtered', filters: { user_ids: [1] } },
    });
    expect(dispatch.dispatch).toHaveBeenCalledWith(expect.anything(), [bob]);
    // Claim-first: conditional UPDATE (id + notified_at IS NULL) before sending.
    expect(em.update).toHaveBeenCalledWith(
      LifeGroupTaskAssignment,
      { id: 'a-1', notifiedAt: expect.anything() as unknown },
      { notifiedAt: expect.any(Date) as unknown },
    );
    expect(em.update.mock.invocationCallOrder[0]).toBeLessThan(
      dispatch.dispatch.mock.invocationCallOrder[0],
    );
  });

  it('notifyAssignee sends nothing when another run already claimed the assignment', async () => {
    const { service, dispatch, em } = makeService({ claimed: false });
    await service.notifyAssignee(
      { id: 'a-1', taskName: 'Palavra' } as LifeGroupTaskAssignment,
      bob as unknown as User,
      'T',
      'M',
    );
    expect(dispatch.dispatch).not.toHaveBeenCalled();
    expect(em.save).not.toHaveBeenCalled();
  });

  it('notifyAssignee releases the claim (notified_at back to NULL) when the send fails', async () => {
    const { service, em } = makeService({ sendError: new Error('fcm down') });
    await expect(
      service.notifyAssignee(
        { id: 'a-1', taskName: 'Palavra' } as LifeGroupTaskAssignment,
        bob as unknown as User,
        'T',
        'M',
      ),
    ).rejects.toThrow('fcm down');
    expect(em.update).toHaveBeenLastCalledWith(
      LifeGroupTaskAssignment,
      { id: 'a-1' },
      { notifiedAt: null },
    );
  });

  it('remindAssignee marks reminded_at', async () => {
    const { service, em } = makeService();
    await service.remindAssignee(
      { id: 'a-1', taskName: 'Palavra' } as LifeGroupTaskAssignment,
      bob as unknown as User,
      'Lembrete',
      'Não esqueça {task}',
    );
    expect(em.update).toHaveBeenCalledWith(
      LifeGroupTaskAssignment,
      { id: 'a-1', remindedAt: expect.anything() as unknown },
      { remindedAt: expect.any(Date) as unknown },
    );
  });

  it('remindAssignee releases reminded_at when the send fails', async () => {
    const { service, em } = makeService({ sendError: new Error('boom') });
    await expect(
      service.remindAssignee(
        { id: 'a-1', taskName: 'Palavra' } as LifeGroupTaskAssignment,
        bob as unknown as User,
        'T',
        'M',
      ),
    ).rejects.toThrow('boom');
    expect(em.update).toHaveBeenLastCalledWith(
      LifeGroupTaskAssignment,
      { id: 'a-1' },
      { remindedAt: null },
    );
  });

  it('decline: notifies the new assignee immediately and the leaders', async () => {
    const { service, dispatch, em } = makeService();
    await service.notifyReassigned(notice, {
      previousUserId: 1,
      reason: 'decline',
    });
    expect(dispatch.dispatch).toHaveBeenCalledTimes(2);
    const first = dispatch.dispatch.mock.calls[0][1] as { id: number }[];
    const second = dispatch.dispatch.mock.calls[1][1] as { id: number }[];
    expect(first.map((u) => u.id)).toEqual([2]);
    expect(second.map((u) => u.id)).toEqual([10, 11]);
    const leaderNote = em.save.mock.calls[1][0] as { message: string };
    expect(leaderNote.message).toContain('Bob recusou');
    expect(leaderNote.message).toContain('Ana');
    expect(em.update).toHaveBeenCalledWith(
      LifeGroupTaskAssignment,
      { id: 'a-1', notifiedAt: expect.anything() as unknown },
      { notifiedAt: expect.any(Date) as unknown },
    );
  });

  it('manual reassignment only notifies the new assignee', async () => {
    const { service, dispatch } = makeService();
    await service.notifyReassigned(notice, {
      previousUserId: 1,
      reason: 'manual',
    });
    expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
  });

  it('notifyUnassignable claims the dispatch key BEFORE pushing the leaders', async () => {
    const { service, dispatch, em } = makeService();
    await service.notifyUnassignable({
      lifeGroupId: 7,
      meetingDate: '2026-06-10',
      taskNames: ['Palavra', 'Oferta'],
    });
    const recipients = dispatch.dispatch.mock.calls[0][1] as { id: number }[];
    expect(recipients.map((u) => u.id)).toEqual([10, 11]);
    const saved = em.save.mock.calls[0][0] as {
      deepLink: string | null;
      message: string;
    };
    expect(saved.deepLink).toBeNull();
    expect(saved.message).toContain('Palavra, Oferta');
    expect(em.insert).toHaveBeenCalledWith(
      ReminderDispatchLog,
      expect.objectContaining({ ruleType: 'life_group_tasks' }),
    );
    expect(em.insert.mock.invocationCallOrder[0]).toBeLessThan(
      dispatch.dispatch.mock.invocationCallOrder[0],
    );
  });

  it('notifyUnassignable stays silent when the claim is lost (23505)', async () => {
    const { service, dispatch } = makeService({
      insertError: { code: '23505' },
    });
    await service.notifyUnassignable({
      lifeGroupId: 7,
      meetingDate: '2026-06-10',
      taskNames: ['Palavra'],
    });
    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });

  it('notifyUnassignable releases the claim when the leader push fails', async () => {
    const { service, em } = makeService({ sendError: new Error('fcm') });
    await expect(
      service.notifyUnassignable({
        lifeGroupId: 7,
        meetingDate: '2026-06-10',
        taskNames: ['Palavra'],
      }),
    ).rejects.toThrow('fcm');
    expect(em.delete).toHaveBeenCalledWith(
      ReminderDispatchLog,
      expect.objectContaining({ ruleType: 'life_group_tasks' }),
    );
  });

  describe('notifyGenerated (manual generate)', () => {
    const today = zonedParts(new Date());
    const inWindow = dateKeyOf(shiftDays(today, 2)); // default offsets [3,1]
    const tooFar = dateKeyOf(shiftDays(today, 10));
    const past = dateKeyOf(shiftDays(today, -1));
    const mk = (id: string, userId: number, meetingDate: string) => ({
      assignmentId: id,
      userId,
      lifeGroupId: 7,
      meetingDate,
      taskName: 'Palavra',
    });

    it('pushes each new assignee through the notified_at claim with the rule title/message', async () => {
      const { service, dispatch, em } = makeService({
        rule: {
          enabled: true,
          config: {
            days_before_meeting: [3, 1],
            hour: 9,
            title: 'Sua tarefa',
            message: 'Você ficou com {task}',
          },
        },
      });
      await service.notifyGenerated([
        mk('a-1', 1, inWindow),
        mk('a-2', 2, inWindow),
      ]);
      expect(dispatch.dispatch).toHaveBeenCalledTimes(2);
      expect((em.save.mock.calls[0][0] as { message: string }).message).toBe(
        'Você ficou com Palavra',
      );
      expect(em.update).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        { id: 'a-2', notifiedAt: expect.anything() as unknown },
        { notifiedAt: expect.any(Date) as unknown },
      );
    });

    it('does not double-send assignments already claimed by the evaluator', async () => {
      const { service, dispatch } = makeService({ claimed: false });
      await service.notifyGenerated([mk('a-1', 1, inWindow)]);
      expect(dispatch.dispatch).not.toHaveBeenCalled();
    });

    it('leaves meetings outside the offset window to the evaluator, and skips past meetings', async () => {
      const { service, dispatch } = makeService();
      await service.notifyGenerated([mk('a-1', 1, tooFar), mk('a-2', 2, past)]);
      expect(dispatch.dispatch).not.toHaveBeenCalled();
    });

    it('does nothing when the reminder rule is disabled', async () => {
      const { service, dispatch } = makeService({
        rule: { enabled: false, config: {} },
      });
      await service.notifyGenerated([mk('a-1', 1, inWindow)]);
      expect(dispatch.dispatch).not.toHaveBeenCalled();
    });

    describe('before the evaluator hour on the largest-offset day', () => {
      afterEach(() => jest.useRealTimers());
      const rule = {
        enabled: true,
        config: { days_before_meeting: [3, 1], hour: 9 },
      };
      // 2026-06-07 is 3 days before 2026-06-10 (largest offset).
      const largestDay = '2026-06-10';
      const smallerDay = '2026-06-09';

      it('leaves notified_at NULL (no push) at 08:00 so the 09:00 evaluator sends it', async () => {
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-06-07T08:00:00-03:00'));
        const { service, dispatch, em } = makeService({ rule });
        await service.notifyGenerated([mk('a-1', 1, largestDay)]);
        expect(dispatch.dispatch).not.toHaveBeenCalled();
        expect(em.update).not.toHaveBeenCalled();
      });

      it('still pushes meetings inside the window but not on the largest-offset day at 08:00', async () => {
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-06-07T08:00:00-03:00'));
        const { service, dispatch } = makeService({ rule });
        await service.notifyGenerated([
          mk('a-1', 1, largestDay),
          mk('a-2', 2, smallerDay),
        ]);
        expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
      });

      it('pushes at/after the configured hour (the evaluator tick may have passed)', async () => {
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-06-07T09:30:00-03:00'));
        const { service, dispatch } = makeService({ rule });
        await service.notifyGenerated([mk('a-1', 1, largestDay)]);
        expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
      });
    });

    it('keeps notifying the others when one push fails (claim released)', async () => {
      const { service, dispatch, em } = makeService();
      dispatch.dispatch.mockRejectedValueOnce(new Error('fcm'));
      await service.notifyGenerated([
        mk('a-1', 1, inWindow),
        mk('a-2', 2, inWindow),
      ]);
      expect(dispatch.dispatch).toHaveBeenCalledTimes(2);
      expect(em.update).toHaveBeenCalledWith(
        LifeGroupTaskAssignment,
        { id: 'a-1' },
        { notifiedAt: null },
      );
    });
  });
});
