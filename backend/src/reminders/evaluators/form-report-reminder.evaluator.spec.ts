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
    create: jest.fn((_e: unknown, v: unknown) => v),
    save: jest.fn((x: object) => Promise.resolve({ id: 10, ...x })),
    update: jest.fn(),
  } as never;
  const dispatchFn = jest.fn();
  const dispatch = { dispatch: dispatchFn } as never;

  it('does not fire when current weekday/hour does not match config', async () => {
    const evaluator = new FormReportReminderEvaluator(entityManager, dispatch);
    // Monday 10:00 — config wants Sunday 20:00
    const now = new Date('2026-06-08T10:00:00');
    await evaluator.run(makeRule(), now);
    expect(dispatchFn).not.toHaveBeenCalled();
  });

  it('does not fire twice in the same period (lastRunAt this period)', async () => {
    const evaluator = new FormReportReminderEvaluator(entityManager, dispatch);
    const now = new Date('2026-06-07T20:30:00'); // Sunday 20:xx
    const rule = makeRule({ lastRunAt: new Date('2026-06-07T20:05:00') });
    await evaluator.run(rule, now);
    expect(dispatchFn).not.toHaveBeenCalled();
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

  describe('life-group-reports group-based skip', () => {
    // The evaluator checks weekday/hour in the runtime's local time: derive the rule from `now`.
    const now = new Date('2026-06-07T20:00:00-03:00');
    const entryFor = (at: Date, slug = 'life-group-reports') => ({
      form_slug: slug,
      title: 'Relatório pendente',
      message: 'msg',
      weekday: at.getDay(),
      hour: at.getHours(),
      roles:
        slug === 'life-group-reports'
          ? ['life_group_leader']
          : ['sector_leader'],
    });
    const leaders = [{ id: 1 }, { id: 2 }, { id: 3 }];

    interface GroupRow {
      id: number;
      leaderId: number | null;
      coLeaderId: number | null;
    }

    /** `groups`: the groups led/co-led by the recipients; `reported`: ids with a report this week. */
    function setup(groups: GroupRow[], reported: number[]) {
      const userQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(leaders),
      };
      const groupQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(groups),
      };
      const reportQb = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue(reported.map((id) => ({ id: String(id) }))),
      };
      const em = {
        insert: jest.fn().mockResolvedValue(undefined),
        createQueryBuilder: jest.fn((entity: { name: string }) => {
          if (entity.name === 'LifeGroupReport') return reportQb;
          if (entity.name === 'LifeGroup') return groupQb;
          return userQb;
        }),
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
      return { evaluator, em, dispatch, reportQb, groupQb };
    }

    const run = (
      evaluator: FormReportReminderEvaluator,
      at: Date = now,
      slug = 'life-group-reports',
    ) =>
      evaluator.run(
        makeRule({ config: { forms: [entryFor(at, slug)] } as never }),
        at,
      );
    const recipientIds = (dispatch: {
      dispatch: jest.Mock<Promise<void>, [unknown, { id: number }[]]>;
    }) => dispatch.dispatch.mock.calls[0][1].map((u) => u.id);

    it('skips a leader whose group has a report this church week and looks it up by group + week', async () => {
      const { evaluator, dispatch, reportQb, groupQb } = setup(
        [
          { id: 10, leaderId: 2, coLeaderId: null },
          { id: 11, leaderId: 3, coLeaderId: null },
        ],
        [10],
      );
      await run(evaluator);

      expect(groupQb.where).toHaveBeenCalledWith(
        'leader.id IN (:...ids) OR coLeader.id IN (:...ids)',
        { ids: [1, 2, 3] },
      );
      expect(reportQb.where).toHaveBeenCalledWith('r.date >= :weekStart', {
        weekStart: '2026-06-01',
      });
      expect(reportQb.andWhere).toHaveBeenCalledWith(
        'r.lifeGroupId IN (:...groupIds)',
        { groupIds: [10, 11] },
      );
      // 1 leads nothing -> still reminded; 2 reported; 3 did not.
      expect(recipientIds(dispatch)).toEqual([1, 3]);
    });

    it('a co-leader report silences the leader (regardless of who submitted)', async () => {
      const { evaluator, dispatch } = setup(
        [{ id: 10, leaderId: 2, coLeaderId: 3 }],
        [10],
      );
      await run(evaluator);
      // 2 (leader) and 3 (co-leader holding the role) are both silenced; 1 leads no group.
      expect(recipientIds(dispatch)).toEqual([1]);
    });

    it('a leader report silences a co-leader who holds the role', async () => {
      const { evaluator, dispatch } = setup(
        [{ id: 20, leaderId: 9, coLeaderId: 1 }],
        [20],
      );
      await run(evaluator);
      expect(recipientIds(dispatch)).toEqual([2, 3]);
    });

    it('a recipient who is only a co-leader is handled (leader without the role)', async () => {
      const { evaluator, dispatch } = setup(
        [{ id: 30, leaderId: null, coLeaderId: 2 }],
        [],
      );
      await run(evaluator);
      expect(recipientIds(dispatch)).toEqual([1, 2, 3]);
    });

    it('a user with two groups is silenced only when ALL of their groups reported', async () => {
      const groups = [
        { id: 10, leaderId: 2, coLeaderId: null },
        { id: 11, leaderId: null, coLeaderId: 2 },
      ];
      const partial = setup(groups, [10]);
      await run(partial.evaluator);
      expect(recipientIds(partial.dispatch)).toEqual([1, 2, 3]);

      const all = setup(groups, [10, 11]);
      await run(all.evaluator);
      expect(recipientIds(all.dispatch)).toEqual([1, 3]);
    });

    it('counts the new week from Monday 00:00 Sao Paulo (Monday morning needs a fresh report)', async () => {
      const monday = new Date('2026-06-08T00:30:00-03:00');
      const { evaluator, reportQb } = setup(
        [{ id: 10, leaderId: 2, coLeaderId: null }],
        [],
      );
      await run(evaluator, monday);
      expect(reportQb.where).toHaveBeenCalledWith('r.date >= :weekStart', {
        weekStart: '2026-06-08',
      });
    });

    it('notifies everyone when nobody reported yet', async () => {
      const { evaluator, dispatch } = setup(
        [{ id: 10, leaderId: 2, coLeaderId: null }],
        [],
      );
      await run(evaluator);
      expect(recipientIds(dispatch)).toEqual([1, 2, 3]);
    });

    it('sends nothing (no notification row) when every leader already has a report', async () => {
      const { evaluator, em, dispatch } = setup(
        [
          { id: 10, leaderId: 1, coLeaderId: null },
          { id: 11, leaderId: 2, coLeaderId: null },
          { id: 12, leaderId: null, coLeaderId: 3 },
        ],
        [10, 11, 12],
      );
      await run(evaluator);
      expect(dispatch.dispatch).not.toHaveBeenCalled();
      expect(em.save).not.toHaveBeenCalled();
    });

    it('leaves other form slugs untouched (no group/report lookup)', async () => {
      const { evaluator, em, dispatch } = setup(
        [{ id: 10, leaderId: 1, coLeaderId: null }],
        [10],
      );
      await run(evaluator, now, 'sector-supervisor-reports');
      const queried = em.createQueryBuilder.mock.calls.map(
        ([entity]) => entity.name,
      );
      expect(queried).not.toContain('LifeGroupReport');
      expect(queried).not.toContain('LifeGroup');
      expect(recipientIds(dispatch)).toEqual([1, 2, 3]);
    });
  });
});
