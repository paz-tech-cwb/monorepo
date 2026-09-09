import { LifeGroupAttendanceReminderEvaluator } from './life-group-attendance-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';

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

  function makeEm(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([group]),
      }),
      findOne: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_e, v) => v),
      save: jest.fn((x) => Promise.resolve({ id: 99, ...x })),
      ...overrides,
    } as never;
  }

  it('fires 2h after meeting start for leader + co-leader', async () => {
    const em = makeEm();
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new LifeGroupAttendanceReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect((dispatch as any).dispatch).toHaveBeenCalledTimes(1);
    const recipients = (dispatch as any).dispatch.mock.calls[0][1];
    expect(recipients.map((u: { id: number }) => u.id)).toEqual([10, 11]);
    expect((em as any).insert).toHaveBeenCalledTimes(1);
  });

  it('skips a group without a fixed meeting day', async () => {
    const em = makeEm();
    (em as any).createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([{ ...group, meetingDay: 'Sem dia fixo' }]),
    });
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new LifeGroupAttendanceReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });

  it('skips a group without a meeting time', async () => {
    const em = makeEm();
    (em as any).createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ ...group, meetingTime: null }]),
    });
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new LifeGroupAttendanceReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });

  it('does not fire outside the reminder hour window', async () => {
    const em = makeEm();
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new LifeGroupAttendanceReminderEvaluator(em, dispatch);
    await evaluator.run(rule, new Date('2026-06-10T19:00:00-03:00')); // meeting start, not +2h

    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });

  it('skips when attendance was already recorded for that date', async () => {
    const em = makeEm({
      findOne: jest.fn().mockResolvedValue({ id: 'existing-attendance' }),
    });
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new LifeGroupAttendanceReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });

  it('fires on the next weekday when meeting_time + hoursAfter crosses midnight', async () => {
    // Late meeting: Wednesday 22:00 + 2h = Thursday 00:00 local time.
    const lateGroup = {
      ...group,
      meetingDay: 'Quarta-feira',
      meetingTime: '22:00:00',
    };
    const em = makeEm();
    (em as any).createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([lateGroup]),
    });
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new LifeGroupAttendanceReminderEvaluator(em, dispatch);
    // Thursday 2026-06-11 00:00 local (Sao Paulo) time.
    await evaluator.run(rule, new Date('2026-06-11T00:00:00-03:00'));

    expect((dispatch as any).dispatch).toHaveBeenCalledTimes(1);
    const notification = (em as any).save.mock.calls[0][0];
    // The recorded meeting date should be Wednesday (the meeting's actual
    // day), not Thursday (the day the reminder fires on).
    expect(notification.deepLink).toContain('/2026-06-10');
  });

  it('skips when a dedupe row already exists (no re-send)', async () => {
    let call = 0;
    const em = makeEm({
      findOne: jest.fn().mockImplementation(() => {
        call++;
        // 1st findOne = attendance lookup (none), 2nd = dedupe log (exists)
        return Promise.resolve(call === 1 ? null : { id: 1 });
      }),
    });
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new LifeGroupAttendanceReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);

    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });
});
