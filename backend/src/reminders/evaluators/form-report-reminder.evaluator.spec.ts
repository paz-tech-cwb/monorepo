import { FormReportReminderEvaluator } from './form-report-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';

describe('FormReportReminderEvaluator', () => {
  const makeRule = (overrides: Partial<ReminderRule> = {}): ReminderRule =>
    ({
      id: 1,
      type: 'form_report',
      enabled: true,
      config: { weekday: 0, hour: 20, minute: 0, roles: ['life_group_leader'] },
      lastRunAt: null,
      ...overrides,
    }) as ReminderRule;

  const entityManager = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((_e, v) => v),
    save: jest.fn((x) => Promise.resolve({ id: 10, ...x })),
    update: jest.fn(),
  } as never;
  const dispatch = { dispatch: jest.fn() } as never;

  it('does not fire when current weekday/hour does not match config', async () => {
    const evaluator = new FormReportReminderEvaluator(entityManager, dispatch);
    // Monday 10:00 — config wants Sunday 20:00
    const now = new Date('2026-06-08T10:00:00');
    await evaluator.run(makeRule(), now);
    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });

  it('does not fire twice in the same period (lastRunAt this period)', async () => {
    const evaluator = new FormReportReminderEvaluator(entityManager, dispatch);
    const now = new Date('2026-06-07T20:30:00'); // Sunday 20:xx
    const rule = makeRule({ lastRunAt: new Date('2026-06-07T20:05:00') });
    await evaluator.run(rule, now);
    expect((dispatch as any).dispatch).not.toHaveBeenCalled();
  });
});
