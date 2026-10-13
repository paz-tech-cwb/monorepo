import {
  FormReportReminderEvaluator,
  churchWeekStartKey,
} from './form-report-reminder.evaluator';
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

  describe('week start (America/Sao_Paulo, ISO week Monday..Sunday)', () => {
    it.each([
      // Monday 00:00 SP (= 03:00Z) starts its own week
      ['2026-06-01T00:00:00-03:00', '2026-06-01'],
      // Sunday 23:30 SP belongs to the week that started the previous Monday
      ['2026-06-07T23:30:00-03:00', '2026-06-01'],
      // 02:30Z Sunday is still Saturday 23:30 in Sao Paulo
      ['2026-06-07T02:30:00Z', '2026-06-01'],
      // one minute after the boundary: the next week
      ['2026-06-08T00:01:00-03:00', '2026-06-08'],
      // mid-week
      ['2026-06-10T12:00:00-03:00', '2026-06-08'],
    ])('%s -> %s', (iso, expected) => {
      expect(churchWeekStartKey(new Date(iso))).toBe(expected);
    });
  });

  describe('life-group-reports submitter skip', () => {
    // The evaluator checks weekday/hour in the runtime's local time: derive the rule from `now`.
    const now = new Date('2026-06-07T20:00:00-03:00');
    const lgEntry = {
      form_slug: 'life-group-reports',
      title: 'Relatório pendente',
      message: 'msg',
      weekday: now.getDay(),
      hour: now.getHours(),
      roles: ['life_group_leader'],
    };
    const sectorEntry = {
      ...lgEntry,
      form_slug: 'sector-supervisor-reports',
      roles: ['sector_leader'],
    };
    const leaders = [{ id: 1 }, { id: 2 }, { id: 3 }];

    function setup(submitterIds: number[]) {
      const userQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(leaders),
      };
      const reportQb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue(submitterIds.map((id) => ({ id: String(id) }))),
      };
      const em = {
        insert: jest.fn().mockResolvedValue(undefined),
        createQueryBuilder: jest.fn((entity: { name: string }) =>
          entity.name === 'LifeGroupReport' ? reportQb : userQb,
        ),
        create: jest.fn((_e: unknown, v: unknown) => v),
        save: jest.fn((x: unknown) =>
          Promise.resolve({ id: 10, ...(x as object) }),
        ),
      };
      const dispatch = {
        dispatch: jest
          .fn<Promise<void>, [unknown, { id: number }[]]>()
          .mockResolvedValue(undefined),
      };
      const evaluator = new FormReportReminderEvaluator(
        em as never,
        dispatch as never,
      );
      return { evaluator, em, dispatch, reportQb };
    }

    it('does not notify leaders who already reported this church week', async () => {
      const { evaluator, dispatch, reportQb } = setup([2]);
      await evaluator.run(
        makeRule({ config: { forms: [lgEntry] } as never }),
        now,
      );

      expect(reportQb.where).toHaveBeenCalledWith('r.date >= :weekStart', {
        weekStart: '2026-06-01',
      });
      expect(reportQb.andWhere).toHaveBeenCalledWith('s.id IN (:...ids)', {
        ids: [1, 2, 3],
      });
      expect(dispatch.dispatch).toHaveBeenCalledTimes(1);
      const recipients = dispatch.dispatch.mock.calls[0][1];
      expect(recipients.map((u) => u.id)).toEqual([1, 3]);
    });

    it('notifies everyone when nobody reported yet', async () => {
      const { evaluator, dispatch } = setup([]);
      await evaluator.run(
        makeRule({ config: { forms: [lgEntry] } as never }),
        now,
      );
      const recipients = dispatch.dispatch.mock.calls[0][1];
      expect(recipients.map((u) => u.id)).toEqual([1, 2, 3]);
    });

    it('sends nothing (no notification row) when every leader already reported', async () => {
      const { evaluator, em, dispatch } = setup([1, 2, 3]);
      await evaluator.run(
        makeRule({ config: { forms: [lgEntry] } as never }),
        now,
      );
      expect(dispatch.dispatch).not.toHaveBeenCalled();
      expect(em.save).not.toHaveBeenCalled();
    });

    it('leaves other form slugs untouched (no submission lookup)', async () => {
      const { evaluator, em, dispatch } = setup([1, 2, 3]);
      await evaluator.run(
        makeRule({ config: { forms: [sectorEntry] } as never }),
        now,
      );
      expect(
        em.createQueryBuilder.mock.calls.some(
          ([entity]) => entity.name === 'LifeGroupReport',
        ),
      ).toBe(false);
      const recipients = dispatch.dispatch.mock.calls[0][1];
      expect(recipients.map((u) => u.id)).toEqual([1, 2, 3]);
    });
  });
});
