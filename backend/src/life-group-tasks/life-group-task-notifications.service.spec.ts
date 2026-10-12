import { EntityManager } from 'typeorm';
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

function makeService(opts: { dedupe?: unknown; group?: unknown } = {}) {
  const users = new Map<number, unknown>([
    [1, bob],
    [2, ana],
  ]);
  const em = {
    findOne: jest.fn(
      (entity: unknown, options: { where: { id?: number } }) => {
        if (entity === User) {
          return Promise.resolve(users.get(options.where.id as number));
        }
        if (entity === LifeGroup) {
          return Promise.resolve(
            opts.group ?? { id: 7, leader, coLeader },
          );
        }
        if (entity === ReminderDispatchLog) {
          return Promise.resolve(opts.dedupe ?? null);
        }
        return Promise.resolve(null);
      },
    ),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: jest.fn((value: unknown) =>
      Promise.resolve({ id: 99, ...(value as object) }),
    ),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    insert: jest.fn().mockResolvedValue(undefined),
  };
  const dispatch = { dispatch: jest.fn().mockResolvedValue(undefined) };
  const service = new LifeGroupTaskNotificationsService(
    em as unknown as EntityManager,
    dispatch as unknown as NotificationDispatchService,
  );
  return { service, em, dispatch };
}

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
    expect(em.update).toHaveBeenCalledWith(
      LifeGroupTaskAssignment,
      { id: 'a-1' },
      { notifiedAt: expect.anything() },
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
      { id: 'a-1' },
      { remindedAt: expect.anything() },
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
      { id: 'a-1' },
      { notifiedAt: expect.anything() },
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

  it('notifyUnassignable tells leader and co-leader once and records the key', async () => {
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
  });

  it('notifyUnassignable does not repeat when already recorded', async () => {
    const { service, dispatch } = makeService({ dedupe: { id: 1 } });
    await service.notifyUnassignable({
      lifeGroupId: 7,
      meetingDate: '2026-06-10',
      taskNames: ['Palavra'],
    });
    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });
});
