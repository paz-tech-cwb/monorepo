import { EntityManager } from 'typeorm';
import { MemberJourneyReminderEvaluator } from './member-journey-reminder.evaluator';
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

describe('MemberJourneyReminderEvaluator', () => {
  const rule = {
    id: 3,
    type: 'member_journey',
    enabled: true,
    config: {
      steps: [{ key: 'baptism', days: 7 }],
      title: 'Lembrete',
      message: 'Complete sua jornada',
    },
  } as ReminderRule;

  it('dispatches once per stuck member and logs dedupe', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const em: MockEntityManager = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { memberId: 7, stageKey: 'baptism', member: { id: 7 } },
          ]),
      }),
      insert: jest.fn().mockResolvedValue(undefined),
      // 1st findOne = dedupe check (null = not sent), 2nd = load the User
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 7 }),
      create: jest.fn((_e, v: object) => v),
      save: jest.fn((x: object) => Promise.resolve({ id: 40, ...x })),
    };
    const dispatch: MockDispatchService = { dispatch: jest.fn() };

    const evaluator = new MemberJourneyReminderEvaluator(
      em as unknown as EntityManager,
      dispatch as unknown as NotificationDispatchService,
    );
    await evaluator.run(rule, now);
    expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
    expect(em.insert).toHaveBeenCalled();
  });

  it('skips when a dedupe row already exists (no re-nudge)', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const em: MockEntityManager = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { memberId: 7, stageKey: 'baptism', member: { id: 7 } },
          ]),
      }),
      insert: jest.fn(),
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 1, dedupeKey: 'journey:7:baptism' }),
      create: jest.fn((_e, v: object) => v),
      save: jest.fn(),
    };
    const dispatch: MockDispatchService = { dispatch: jest.fn() };

    const evaluator = new MemberJourneyReminderEvaluator(
      em as unknown as EntityManager,
      dispatch as unknown as NotificationDispatchService,
    );
    await evaluator.run(rule, now);
    expect(dispatch.dispatch).not.toHaveBeenCalled();
    expect(em.insert).not.toHaveBeenCalled();
  });
});
