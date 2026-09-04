import { EntityManager } from 'typeorm';
import { FormReportReminderEvaluator } from './form-report-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';

interface MockEntityManager {
  createQueryBuilder: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
}

interface MockDispatchService {
  dispatch: jest.Mock;
}

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

  const entityManager: MockEntityManager = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((_e, v: object) => v),
    save: jest.fn((x: object) => Promise.resolve({ id: 10, ...x })),
    update: jest.fn(),
  };
  const dispatch: MockDispatchService = { dispatch: jest.fn() };

  it('does not fire when current weekday/hour does not match config', async () => {
    const evaluator = new FormReportReminderEvaluator(
      entityManager as unknown as EntityManager,
      dispatch as unknown as NotificationDispatchService,
    );
    // Monday 10:00 — config wants Sunday 20:00
    const now = new Date('2026-06-08T10:00:00');
    await evaluator.run(makeRule(), now);
    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });

  it('does not fire twice in the same period (lastRunAt this period)', async () => {
    const evaluator = new FormReportReminderEvaluator(
      entityManager as unknown as EntityManager,
      dispatch as unknown as NotificationDispatchService,
    );
    const now = new Date('2026-06-07T20:30:00'); // Sunday 20:xx
    const rule = makeRule({ lastRunAt: new Date('2026-06-07T20:05:00') });
    await evaluator.run(rule, now);
    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });
});
