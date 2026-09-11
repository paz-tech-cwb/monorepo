import { EntityManager } from 'typeorm';
import { LifeGroupAttendanceReminderEvaluator } from './life-group-attendance-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';

interface MockQueryBuilder {
  leftJoinAndSelect: jest.Mock<MockQueryBuilder, unknown[]>;
  where: jest.Mock<MockQueryBuilder, unknown[]>;
  andWhere: jest.Mock<MockQueryBuilder, unknown[]>;
  getMany: jest.Mock<Promise<unknown[]>, []>;
}

interface MockEntityManager {
  createQueryBuilder: jest.Mock<MockQueryBuilder, unknown[]>;
  findOne: jest.Mock<Promise<unknown>, unknown[]>;
  insert: jest.Mock<Promise<unknown>, unknown[]>;
  create: jest.Mock<unknown, unknown[]>;
  save: jest.Mock<Promise<unknown>, unknown[]>;
}

interface MockDispatch {
  dispatch: jest.Mock<Promise<unknown>, unknown[]>;
}

describe('LifeGroupAttendanceReminderEvaluator', () => {
  const rule = {
    id: 4,
    type: 'life_group_attendance',
    enabled: true,
    config: {
      hours_after_meeting_start: 2,
      title: 'Lançar presença',
      message: 'Não esqueça de lançar a presença.',
    },
  } as ReminderRule;

  // 2026-06-10 is a Wednesday ("Quarta-feira") in America/Sao_Paulo (UTC-03:00).
  const now = new Date('2026-06-10T21:00:00-03:00');

  const group = {
    id: 7,
    meetingDay: 'Quarta-feira',
    meetingTime: '19:00:00',
    leader: { id: 10 },
    coLeader: { id: 11 },
  };

  function makeQueryBuilder(rows: unknown[]): MockQueryBuilder {
    const qb: MockQueryBuilder = {
      leftJoinAndSelect: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      getMany: jest.fn<Promise<unknown[]>, []>().mockResolvedValue(rows),
    };
    return qb;
  }

  function makeEm(
    overrides: Partial<MockEntityManager> = {},
  ): MockEntityManager {
    return {
      createQueryBuilder: jest.fn(() => makeQueryBuilder([group])),
      findOne: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue(null),
      insert: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue(undefined),
      create: jest.fn((_e: unknown, v: unknown) => v),
      save: jest.fn((x: unknown) =>
        Promise.resolve({ id: 99, ...(x as object) }),
      ),
      ...overrides,
    };
  }

  function makeDispatch(): MockDispatch {
    return { dispatch: jest.fn<Promise<unknown>, unknown[]>() };
  }

  function makeEvaluator(em: MockEntityManager, dispatch: MockDispatch) {
    return new LifeGroupAttendanceReminderEvaluator(
      em as unknown as EntityManager,
      dispatch as unknown as NotificationDispatchService,
    );
  }

  it('fires 2h after meeting start for leader + co-leader', async () => {
    const em = makeEm();
    const dispatch = makeDispatch();

    const evaluator = makeEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
    const recipients = dispatch.dispatch.mock.calls[0][1] as { id: number }[];
    expect(recipients.map((u) => u.id)).toEqual([10, 11]);
    expect(em.insert).toHaveBeenCalledTimes(1);
  });

  it('skips a group without a fixed meeting day', async () => {
    const em = makeEm();
    em.createQueryBuilder.mockReturnValue(
      makeQueryBuilder([{ ...group, meetingDay: 'Sem dia fixo' }]),
    );
    const dispatch = makeDispatch();

    const evaluator = makeEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });

  it('skips a group without a meeting time', async () => {
    const em = makeEm();
    em.createQueryBuilder.mockReturnValue(
      makeQueryBuilder([{ ...group, meetingTime: null }]),
    );
    const dispatch = makeDispatch();

    const evaluator = makeEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });

  it('does not fire outside the reminder hour window', async () => {
    const em = makeEm();
    const dispatch = makeDispatch();

    const evaluator = makeEvaluator(em, dispatch);
    await evaluator.run(rule, new Date('2026-06-10T19:00:00-03:00')); // meeting start, not +2h

    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });

  it('skips when attendance was already recorded for that date', async () => {
    const em = makeEm({
      findOne: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue({ id: 'existing-attendance' }),
    });
    const dispatch = makeDispatch();

    const evaluator = makeEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });

  it('fires on the next weekday when meeting_time + hoursAfter crosses midnight', async () => {
    // Late meeting: Wednesday 22:00 + 2h = Thursday 00:00 local time.
    const lateGroup = {
      ...group,
      meetingDay: 'Quarta-feira',
      meetingTime: '22:00:00',
    };
    const em = makeEm();
    em.createQueryBuilder.mockReturnValue(makeQueryBuilder([lateGroup]));
    const dispatch = makeDispatch();

    const evaluator = makeEvaluator(em, dispatch);
    // Thursday 2026-06-11 00:00 local (Sao Paulo) time.
    await evaluator.run(rule, new Date('2026-06-11T00:00:00-03:00'));

    expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
    const notification = em.save.mock.calls[0][0] as { deepLink: string };
    // The recorded meeting date should be Wednesday (the meeting's actual
    // day), not Thursday (the day the reminder fires on).
    expect(notification.deepLink).toContain('/2026-06-10');
  });

  it('skips when a dedupe row already exists (no re-send)', async () => {
    let call = 0;
    const em = makeEm({
      findOne: jest.fn<Promise<unknown>, unknown[]>().mockImplementation(() => {
        call++;
        // 1st findOne = attendance lookup (none), 2nd = dedupe log (exists)
        return Promise.resolve(call === 1 ? null : { id: 1 });
      }),
    });
    const dispatch = makeDispatch();

    const evaluator = makeEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });
});
