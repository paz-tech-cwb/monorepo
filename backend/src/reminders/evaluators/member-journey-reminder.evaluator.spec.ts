import { MemberJourneyReminderEvaluator } from './member-journey-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { JourneyTrackStep } from '../../journey-tracks/entities/journey-track-step.entity';
import { MemberJourneyStepProgress } from '../../journey-tracks/entities/member-journey-step-progress.entity';
import { User } from '../../users/entities/user.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';

type EntityRef = new (...args: unknown[]) => unknown;

function buildDispatchMock() {
  return { dispatch: jest.fn() };
}

describe('MemberJourneyReminderEvaluator', () => {
  const rule = {
    id: 3,
    type: 'member_journey',
    enabled: true,
    config: {
      steps: [{ key: 'become_member_cafe_pastor', days: 7 }],
      title: 'Lembrete',
      message: 'Complete sua jornada',
    },
  } as ReminderRule;

  const staleUser = {
    id: 7,
    role: { slug: 'lead' },
    updatedAt: new Date('2026-06-01T00:00:00'),
  } as User;

  const step = {
    id: 1,
    key: 'become_member_cafe_pastor',
    trackId: 10,
    track: { id: 10, key: 'become_member' },
  } as unknown as JourneyTrackStep;

  it('dispatches once per stuck member and logs dedupe', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const em = {
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return Promise.resolve([step]);
        if (entity === User) return Promise.resolve([staleUser]);
        if (entity === MemberJourneyStepProgress) return Promise.resolve([]);
        return Promise.resolve([]);
      }),
      insert: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_e: EntityRef, v: unknown) => v),
      save: jest.fn((x: Record<string, unknown>) =>
        Promise.resolve({ id: 40, ...x }),
      ),
    };
    const dispatch = buildDispatchMock();

    const evaluator = new MemberJourneyReminderEvaluator(
      em as never,
      dispatch as never,
    );
    await evaluator.run(rule, now);
    expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
    expect(em.insert).toHaveBeenCalled();
  });

  it('skips when a dedupe row already exists (no re-nudge)', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const em = {
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return Promise.resolve([step]);
        if (entity === User) return Promise.resolve([staleUser]);
        if (entity === MemberJourneyStepProgress) return Promise.resolve([]);
        return Promise.resolve([]);
      }),
      insert: jest.fn(),
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        dedupeKey: 'journey:7:become_member_cafe_pastor',
      } as Partial<ReminderDispatchLog>),
      create: jest.fn((_e: EntityRef, v: unknown) => v),
      save: jest.fn(),
    };
    const dispatch = buildDispatchMock();

    const evaluator = new MemberJourneyReminderEvaluator(
      em as never,
      dispatch as never,
    );
    await evaluator.run(rule, now);
    expect(dispatch.dispatch).not.toHaveBeenCalled();
    expect(em.insert).not.toHaveBeenCalled();
  });

  it('does not nudge a member who already completed the step', async () => {
    const now = new Date('2026-06-10T20:00:00');
    const em = {
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return Promise.resolve([step]);
        if (entity === User) return Promise.resolve([staleUser]);
        if (entity === MemberJourneyStepProgress) {
          return Promise.resolve([{ memberId: 7, stepId: 1 }]);
        }
        return Promise.resolve([]);
      }),
      insert: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((_e: EntityRef, v: unknown) => v),
      save: jest.fn(),
    };
    const dispatch = buildDispatchMock();

    const evaluator = new MemberJourneyReminderEvaluator(
      em as never,
      dispatch as never,
    );
    await evaluator.run(rule, now);
    expect(dispatch.dispatch).not.toHaveBeenCalled();
  });
});
