import { EventReminderEvaluator } from './event-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';

describe('EventReminderEvaluator', () => {
  const rule = {
    id: 2,
    type: 'event',
    enabled: true,
    config: { lead_times_hours: [24] },
  } as ReminderRule;

  it('fires for an event whose start is within the 24h lead window', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const eventStart = new Date('2026-06-11T20:30:00'); // ~24h ahead
    const em = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 5, title: 'Culto', initialDate: eventStart }]) // events
          .mockResolvedValue([{ id: 1 }]), // users
      }),
      insert: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_e, v) => v),
      save: jest.fn((x) => Promise.resolve({ id: 30, ...x })),
    } as never;
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new EventReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).toHaveBeenCalledTimes(1);
  });

  it('skips when dedupe insert raises a unique violation', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const eventStart = new Date('2026-06-11T20:30:00');
    const em = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 5, title: 'Culto', initialDate: eventStart }]),
      }),
      insert: jest.fn().mockRejectedValue({ code: '23505' }),
      create: jest.fn((_e, v) => v),
      save: jest.fn(),
    } as never;
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new EventReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });
});
