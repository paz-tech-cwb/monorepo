import { MemberJourneyReminderEvaluator } from './member-journey-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';

describe('MemberJourneyReminderEvaluator', () => {
  const rule = {
    id: 3,
    type: 'member_journey',
    enabled: true,
    config: { threshold_days: 7, steps: ['baptism'] },
  } as ReminderRule;

  it('dispatches once per stuck member and logs dedupe', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const em = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { memberId: 7, stageKey: 'baptism', member: { id: 7 } },
        ]),
      }),
      insert: jest.fn().mockResolvedValue(undefined),
      // 1st findOne = dedupe check (null = not sent), 2nd = load the User
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 7 }),
      create: jest.fn((_e, v) => v),
      save: jest.fn((x) => Promise.resolve({ id: 40, ...x })),
    } as never;
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new MemberJourneyReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).toHaveBeenCalledTimes(1);
    expect((em as any).insert).toHaveBeenCalled();
  });

  it('skips when a dedupe row already exists (no re-nudge)', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const em = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ memberId: 7, stageKey: 'baptism', member: { id: 7 } }]),
      }),
      insert: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ id: 1, dedupeKey: 'journey:7:baptism' }),
      create: jest.fn((_e, v) => v),
      save: jest.fn(),
    } as never;
    const dispatch = { dispatch: jest.fn() } as never;

    const evaluator = new MemberJourneyReminderEvaluator(em, dispatch);
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
    expect((em as any).insert).not.toHaveBeenCalled();
  });
});
