import { EntityManager } from 'typeorm';
import { EventReminderEvaluator } from './event-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';

interface MockEntityManager {
  createQueryBuilder: jest.Mock;
  findOne: jest.Mock;
  insert: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
}

interface MockDispatchService {
  dispatch: jest.Mock;
}

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
    const em: MockEntityManager = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 5, title: 'Culto', initialDate: eventStart },
          ]) // events
          .mockResolvedValue([{ id: 1 }]), // users
      }),
      findOne: jest.fn().mockResolvedValue(null), // no dedupe row yet
      insert: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_e, v: object) => v),
      save: jest.fn((x: object) => Promise.resolve({ id: 30, ...x })),
    };
    const dispatch: MockDispatchService = { dispatch: jest.fn() };

    const evaluator = new EventReminderEvaluator(
      em as unknown as EntityManager,
      dispatch as unknown as NotificationDispatchService,
    );
    await evaluator.run(rule, now);
    expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
    // dedupe row recorded only after a successful dispatch
    expect(em.insert).toHaveBeenCalledTimes(1);
  });

  it('skips when a dedupe row already exists (no re-send)', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const eventStart = new Date('2026-06-11T20:30:00');
    const em: MockEntityManager = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 5, title: 'Culto', initialDate: eventStart },
          ]),
      }),
      findOne: jest.fn().mockResolvedValue({ id: 1, dedupeKey: 'event:5:24h' }),
      insert: jest.fn(),
      create: jest.fn((_e, v: object) => v),
      save: jest.fn(),
    };
    const dispatch: MockDispatchService = { dispatch: jest.fn() };

    const evaluator = new EventReminderEvaluator(
      em as unknown as EntityManager,
      dispatch as unknown as NotificationDispatchService,
    );
    await evaluator.run(rule, now);
    expect(dispatch.dispatch).not.toHaveBeenCalled();
    expect(em.insert).not.toHaveBeenCalled();
  });
});
