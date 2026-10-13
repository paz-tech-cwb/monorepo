/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- in-memory EntityManager test double */
import { Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroupAttendanceReminderEvaluator } from './life-group-attendance-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { ReminderDispatchLog } from '../entities/reminder-dispatch-log.entity';
import { LifeGroupAttendance } from '../../life-group-attendance/entities/life-group-attendance.entity';
import { LifeGroupReport } from '../../life-group-reports/entities/life-group-report.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { DEFAULT_CONFIGS } from '../types/reminder-config';

type Row = Record<string, any>;

/**
 * In-memory EntityManager covering only what the meeting-v2 reminders touch.
 * `insert` into the dispatch log is atomic (check + add after one async hop)
 * like a unique index, so concurrent runs are observable.
 */
class FakeEm {
  groups: Row[] = [];
  attendance: Row[] = [];
  reports: Row[] = [];
  log = new Set<string>();
  insertFailure?: Error;
  events: string[] = [];

  createQueryBuilder() {
    const qb: any = {
      leftJoinAndSelect: () => qb,
      where: () => qb,
      andWhere: () => qb,
      getMany: () => Promise.resolve(this.groups),
    };
    return qb;
  }

  findOne(entity: unknown, opts: { where: Row }): Promise<Row | null> {
    if (entity !== LifeGroupAttendance) throw new Error('unexpected findOne');
    return Promise.resolve(
      this.attendance.find(
        (a) =>
          a.lifeGroupId === opts.where.lifeGroupId &&
          a.meetingDate === opts.where.meetingDate &&
          (opts.where.isExtra === undefined ||
            !!a.isExtra === opts.where.isExtra),
      ) ?? null,
    );
  }

  /** One batched query per run: group ids (In) within a date range (Between). */
  find(entity: unknown, opts: { where: Row }): Promise<Row[]> {
    if (entity !== LifeGroupAttendance) throw new Error('unexpected find');
    this.findCalls++;
    const ids = opts.where.lifeGroupId.value as number[];
    const [from, to] = opts.where.meetingDate.value as [string, string];
    return Promise.resolve(
      this.attendance.filter(
        (a) =>
          ids.includes(a.lifeGroupId) &&
          a.meetingDate >= from &&
          a.meetingDate <= to,
      ),
    );
  }

  findCalls = 0;
  existsWheres: Row[][] = [];

  exists(entity: unknown, opts: { where: Row[] }): Promise<boolean> {
    if (entity !== LifeGroupReport) throw new Error('unexpected exists');
    this.existsWheres.push(opts.where);
    return Promise.resolve(
      this.reports.some(
        (r) =>
          !r.deletedAt &&
          opts.where.some((w) => {
            if (r.lifeGroupId !== w.lifeGroupId) return false;
            if ('attendanceId' in w) return r.attendanceId === w.attendanceId;
            const [from, to] = w.date.value as [string, string];
            return r.date >= from && r.date <= to;
          }),
      ),
    );
  }

  async insert(entity: unknown, values: Row): Promise<void> {
    if (entity !== ReminderDispatchLog) throw new Error('unexpected insert');
    await Promise.resolve();
    if (this.insertFailure) throw this.insertFailure;
    const key = `${values.ruleType}|${values.dedupeKey}`;
    if (this.log.has(key))
      throw Object.assign(new Error('dup'), { code: '23505' });
    this.log.add(key);
    this.events.push(`claim:${values.dedupeKey}`);
  }

  delete(entity: unknown, where: Row): Promise<void> {
    if (entity !== ReminderDispatchLog) throw new Error('unexpected delete');
    this.log.delete(`${where.ruleType}|${where.dedupeKey}`);
    this.events.push(`release:${where.dedupeKey}`);
    return Promise.resolve();
  }

  create(_entity: unknown, values: Row): Row {
    return values;
  }

  save(values: Row): Promise<Row> {
    return Promise.resolve({ id: 1, ...values });
  }

  updates: Row[] = [];

  update(_entity: unknown, where: Row, values: Row): Promise<void> {
    this.updates.push({ where, values });
    return Promise.resolve();
  }
}

interface Sent {
  title: string;
  message: string;
  deepLink: string;
  category: string;
  recipients: number[];
}

describe('LifeGroupMeetingV2Reminders (LIFE_GROUP_MEETING_V2 on)', () => {
  const rule = {
    id: 4,
    type: 'life_group_attendance',
    enabled: true,
    config: {
      hours_after_meeting_start: 2,
      title: 'legacy title',
      message: 'legacy message',
    },
  } as ReminderRule;

  // 2026-06-10 is a Wednesday. America/Sao_Paulo is UTC-03:00 all year.
  const MEETING = '2026-06-10';
  const sp = (isoLocal: string) => new Date(`${isoLocal}-03:00`);

  const leader = { id: 10 };
  const coLeader = { id: 11 };
  const sectorLeader = { id: 20 };
  const sectorCoLeader = { id: 21 };
  const baseGroup = (): Row => ({
    id: 7,
    name: 'Life Alfa',
    meetingDay: 'Quarta-feira',
    meetingTime: '19:00:00',
    leader,
    coLeader,
    sector: { id: 3, leader: sectorLeader, coLeader: sectorCoLeader },
  });

  let em: FakeEm;
  let sent: Sent[];
  let dispatchMock: jest.Mock;
  let evaluator: LifeGroupAttendanceReminderEvaluator;
  const originalFlag = process.env.LIFE_GROUP_MEETING_V2;

  function makeEvaluator(target: FakeEm = em) {
    return new LifeGroupAttendanceReminderEvaluator(
      target as unknown as EntityManager,
      { dispatch: dispatchMock } as unknown as NotificationDispatchService,
    );
  }

  /** Moves the fake clock and runs one scheduler tick at that instant. */
  async function tickAt(date: Date, runner = evaluator, config?: Row) {
    jest.setSystemTime(date);
    await runner.run(
      config ? ({ ...rule, config } as ReminderRule) : rule,
      new Date(),
    );
  }

  /** Hourly ticks (like the cron) from `from` to `to`, inclusive. */
  async function tickHourly(from: Date, to: Date, config?: Row) {
    for (let t = from.getTime(); t <= to.getTime(); t += 3_600_000) {
      await tickAt(new Date(t), evaluator, config);
    }
  }

  const attend = (date = MEETING, gid = 7, isExtra = false) =>
    em.attendance.push({
      id: `att-${gid}-${date}`,
      lifeGroupId: gid,
      meetingDate: date,
      isExtra,
    });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    process.env.LIFE_GROUP_MEETING_V2 = 'true';
    em = new FakeEm();
    em.groups = [baseGroup()];
    sent = [];
    dispatchMock = jest.fn((notification: Row, users: Row[]) => {
      em.events.push(`send:${notification.deepLink}`);
      sent.push({
        title: notification.title,
        message: notification.message,
        deepLink: notification.deepLink,
        category: notification.category,
        recipients: users.map((u) => u.id),
      });
      return Promise.resolve();
    });
    evaluator = makeEvaluator();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalFlag === undefined) delete process.env.LIFE_GROUP_MEETING_V2;
    else process.env.LIFE_GROUP_MEETING_V2 = originalFlag;
  });

  describe('primary push', () => {
    it('sends the combined copy to leader + co-leader, claiming the key before sending', async () => {
      await tickAt(sp(`${MEETING}T21:00:00`));

      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({
        title: DEFAULT_CONFIGS.life_group_attendance['meeting_title' as never],
        deepLink: `paz://presenca/7/${MEETING}`,
        category: 'life_group_attendance',
        recipients: [10, 11],
      });
      expect(em.events).toEqual([
        `claim:life_group_attendance:7:${MEETING}`,
        `send:paz://presenca/7/${MEETING}`,
      ]);
    });

    it('uses the same dedupe key as the legacy path (no re-send when the flag flips on)', async () => {
      em.log.add(`life_group_attendance|life_group_attendance:7:${MEETING}`);
      await tickAt(sp(`${MEETING}T21:00:00`));
      expect(sent).toHaveLength(0);
    });

    it('sends once to a leader who is also co-leader (dedupe by user)', async () => {
      em.groups = [{ ...baseGroup(), coLeader: leader }];
      await tickAt(sp(`${MEETING}T21:00:00`));
      expect(sent[0].recipients).toEqual([10]);
    });

    it('notifies a co-leader when there is no leader', async () => {
      em.groups = [{ ...baseGroup(), leader: null }];
      await tickAt(sp(`${MEETING}T21:00:00`));
      expect(sent[0].recipients).toEqual([11]);
    });

    it('does nothing when the group has no leader and no co-leader', async () => {
      em.groups = [{ ...baseGroup(), leader: null, coLeader: null }];
      await tickAt(sp(`${MEETING}T21:00:00`));
      expect(sent).toHaveLength(0);
      expect(em.log.size).toBe(0);
    });

    it('skips when attendance already exists (report missing is the follow-up job)', async () => {
      attend();
      await tickAt(sp(`${MEETING}T21:00:00`));
      expect(sent).toHaveLength(0);
    });

    it('skips when attendance and report both exist', async () => {
      attend();
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: `att-7-${MEETING}`,
        date: MEETING,
      });
      await tickAt(sp(`${MEETING}T21:00:00`));
      expect(sent).toHaveLength(0);
    });

    it('only fires in the reminder hour', async () => {
      await tickHourly(sp(`${MEETING}T00:00:00`), sp(`${MEETING}T20:00:00`));
      await tickAt(sp(`${MEETING}T22:00:00`));
      expect(sent).toHaveLength(0);
    });

    it('releases the claim and keeps going when the send throws, then retries next tick', async () => {
      dispatchMock.mockRejectedValueOnce(new Error('fcm down'));
      await expect(tickAt(sp(`${MEETING}T21:00:00`))).resolves.toBeUndefined();
      expect(em.log.size).toBe(0);
      expect(em.events).toContain(`release:life_group_attendance:7:${MEETING}`);
      await tickAt(sp(`${MEETING}T21:30:00`));
      expect(sent).toHaveLength(1);
    });

    it('lets two concurrent instances produce exactly one push (claim-first)', async () => {
      const a = makeEvaluator();
      const b = makeEvaluator();
      jest.setSystemTime(sp(`${MEETING}T21:00:00`));
      const now = new Date();
      await Promise.all([a.run(rule, now), b.run(rule, now)]);
      expect(sent).toHaveLength(1);
    });
  });

  describe('timezone and midnight rollover (primary push)', () => {
    it('uses Sao Paulo, not UTC: 00:00 UTC on the 11th is still the 10th 21:00 SP', async () => {
      await tickAt(new Date('2026-06-11T00:00:00Z'));
      expect(sent).toHaveLength(1);
      expect(sent[0].deepLink).toBe(`paz://presenca/7/${MEETING}`);
    });

    it('does not fire at 02:00 UTC (= 23:00 SP the previous day)', async () => {
      await tickAt(new Date('2026-06-11T02:00:00Z'));
      expect(sent).toHaveLength(0);
    });

    it('a 22:00 meeting reminds at 00:00 SP the next day for the previous meeting date', async () => {
      em.groups = [{ ...baseGroup(), meetingTime: '22:00:00' }];
      await tickAt(new Date('2026-06-11T03:00:00Z')); // 00:00 SP on Thursday 11th
      expect(sent).toHaveLength(1);
      expect(sent[0].deepLink).toBe(`paz://presenca/7/${MEETING}`);
    });

    it('an extra attendance on the regular date does not count as the regular meeting recorded', async () => {
      attend(MEETING, 7, true);
      await tickAt(sp(`${MEETING}T21:00:00`));
      expect(sent).toHaveLength(1);
      expect(sent[0].title).toBe(
        DEFAULT_CONFIGS.life_group_attendance['meeting_title' as never],
      );
    });
  });

  // Meeting: Wednesday 2026-06-10 19:00 SP. +24h Thu 11th 19:00, +48h Fri 12th,
  // +72h Sat 13th, +96h Sun 14th, escalation +120h Mon 15th 19:00 (all SP).
  const FOLLOWUPS = [
    '2026-06-11T19:00:00',
    '2026-06-12T19:00:00',
    '2026-06-13T19:00:00',
    '2026-06-14T19:00:00',
  ];
  const ESCALATION = '2026-06-15T19:00:00';

  describe('follow-up (attendance saved, report missing): relative to the meeting datetime', () => {
    beforeEach(() => attend());

    it('first follow-up at exactly +24h: not at +23h, sent at +24h, not twice', async () => {
      await tickAt(sp('2026-06-11T18:00:00')); // +23h
      expect(sent).toHaveLength(0);
      await tickAt(sp(FOLLOWUPS[0]));
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({
        title: 'Relatório do Life Group pendente',
        deepLink: `paz://presenca/7/${MEETING}`,
        category: 'life_group_attendance',
        recipients: [10, 11],
      });
      await tickAt(sp(FOLLOWUPS[0])); // same tick twice
      expect(sent).toHaveLength(1);
    });

    it('sends at +24h, +48h, +72h and +96h, then nothing more before the escalation', async () => {
      for (const iso of FOLLOWUPS) await tickAt(sp(iso));
      expect(sent).toHaveLength(4);
      expect(sent.every((n) => n.recipients.join() === '10,11')).toBe(true);
      // no push from +99h (past the last window) until +119h
      await tickHourly(sp('2026-06-14T22:00:00'), sp('2026-06-15T18:00:00'));
      expect(sent).toHaveLength(4);
    });

    it('a full hourly sweep from the meeting to day 9 sends exactly 4 follow-ups + 1 escalation', async () => {
      await tickHourly(sp(`${MEETING}T19:00:00`), sp('2026-06-17T20:00:00'));
      expect(sent).toHaveLength(5);
      expect(sent.slice(0, 4).map((n) => n.title)).toEqual(
        Array(4).fill('Relatório do Life Group pendente'),
      );
      expect(sent[4].deepLink).toBe('paz://lifegroup/7');
      expect(sent[4].recipients).toEqual([20, 21]);
    });

    it('a 22:00 meeting: +24h is the next day 22:00 SP', async () => {
      em.groups = [{ ...baseGroup(), meetingTime: '22:00:00' }];
      await tickAt(sp('2026-06-11T21:00:00')); // +23h
      expect(sent).toHaveLength(0);
      await tickAt(sp('2026-06-11T22:00:00'));
      expect(sent).toHaveLength(1);
      await tickAt(sp('2026-06-12T22:00:00'));
      expect(sent).toHaveLength(2);
    });

    it('rolls over midnight: a 23:30 meeting is due at 23:30 next day, sent by the 00:00 tick', async () => {
      em.groups = [{ ...baseGroup(), meetingTime: '23:30:00' }];
      await tickAt(sp('2026-06-11T23:00:00'));
      expect(sent).toHaveLength(0);
      await tickAt(sp('2026-06-12T00:00:00')); // 30 min after due, across midnight
      expect(sent).toHaveLength(1);
    });

    it('uses the minutes of meeting_time: due 21:30 is sent by the 22:00 tick, not the 21:00 one', async () => {
      em.groups = [{ ...baseGroup(), meetingTime: '21:30:00' }];
      await tickAt(sp('2026-06-11T21:00:00'));
      expect(sent).toHaveLength(0);
      await tickAt(sp('2026-06-11T22:00:00'));
      expect(sent).toHaveLength(1);
      await tickAt(sp('2026-06-11T23:00:00')); // still in the window: claim dedupes
      expect(sent).toHaveLength(1);
    });

    it('is Sao Paulo time: 22:00 UTC on the 11th (19:00 SP) fires, 19:00 UTC (16:00 SP) does not', async () => {
      await tickAt(new Date('2026-06-11T19:00:00Z'));
      expect(sent).toHaveLength(0);
      await tickAt(new Date('2026-06-11T22:00:00Z'));
      expect(sent).toHaveLength(1);
    });

    it('catch-up: a failed +24h send is retried by the next tick and sent once', async () => {
      dispatchMock.mockRejectedValueOnce(new Error('fcm down'));
      await tickAt(sp(FOLLOWUPS[0]));
      expect(sent).toHaveLength(0);
      expect(em.log.size).toBe(0);
      await tickAt(sp('2026-06-11T20:00:00'));
      expect(sent).toHaveLength(1);
      await tickAt(sp('2026-06-11T21:00:00'));
      expect(sent).toHaveLength(1);
    });

    it('catch-up window is [due, due + 2h] inclusive: +26h sends, +27h does not', async () => {
      await tickAt(sp('2026-06-11T21:00:00')); // +26h
      expect(sent).toHaveLength(1);
      sent.length = 0;
      em.log.clear();
      await tickAt(sp('2026-06-11T22:00:00')); // +27h
      expect(sent).toHaveLength(0);
    });

    it('followup_window_hours is configurable (6h: still sent 5h after the due time, not 7h)', async () => {
      const config = { ...rule.config, followup_window_hours: 6 };
      await tickAt(sp('2026-06-11T18:00:00'), evaluator, config);
      expect(sent).toHaveLength(0);
      await tickAt(sp('2026-06-12T00:00:00'), evaluator, config);
      expect(sent).toHaveLength(1);
      sent.length = 0;
      await tickAt(sp('2026-06-12T02:00:00'), evaluator, config);
      expect(sent).toHaveLength(0);
    });

    it.each([0, 1])(
      'a stored window of %i (below the 2h floor) behaves as 2h',
      async (stored) => {
        const config = { ...rule.config, followup_window_hours: stored };
        await tickAt(sp('2026-06-11T21:30:00'), evaluator, config);
        expect(sent).toHaveLength(0);
        await tickAt(sp('2026-06-11T20:59:00'), evaluator, config);
        expect(sent).toHaveLength(1);
      },
    );

    it('honors followup_first_after_hours / followup_interval_hours (first +12h, every 36h)', async () => {
      const config = {
        ...rule.config,
        followup_first_after_hours: 12,
        followup_interval_hours: 36,
      };
      // +12h = Thu 07:00, +48h = Fri 19:00, +84h = Sun 07:00, +120h = escalation
      await tickHourly(
        sp(`${MEETING}T19:00:00`),
        sp('2026-06-14T23:00:00'),
        config,
      );
      expect(sent).toHaveLength(3);
    });

    it('old saved config: followup_interval_days 2 maps to 48h, followup_hour is ignored', async () => {
      const config = {
        ...rule.config,
        followup_interval_days: 2,
        followup_hour: 9,
      };
      await tickHourly(
        sp(`${MEETING}T19:00:00`),
        sp('2026-06-14T23:00:00'),
        config,
      );
      // +24h and +72h only (+120h is the escalation)
      expect(sent).toHaveLength(2);
      expect(sent.every((n) => n.recipients.join() === '10,11')).toBe(true);
    });

    it('followup_max_days caps the follow-ups (max 2: +24h and +48h)', async () => {
      const config = { ...rule.config, followup_max_days: 2 };
      await tickHourly(
        sp(`${MEETING}T19:00:00`),
        sp('2026-06-14T23:00:00'),
        config,
      );
      expect(sent).toHaveLength(2);
    });

    it('followup_max_days 0 disables the follow-up but not the escalation', async () => {
      const config = { ...rule.config, followup_max_days: 0 };
      await tickHourly(
        sp(`${MEETING}T19:00:00`),
        sp('2026-06-15T23:00:00'),
        config,
      );
      expect(sent).toHaveLength(1);
      expect(sent[0].deepLink).toBe('paz://lifegroup/7');
    });

    it('escalation_after_days 0 disables the escalation and lets follow-ups run to the cap', async () => {
      const config = { ...rule.config, escalation_after_days: 0 };
      await tickHourly(
        sp(`${MEETING}T19:00:00`),
        sp('2026-06-17T20:00:00'),
        config,
      );
      expect(sent).toHaveLength(5); // +24h..+120h (max_days 5)
      expect(
        sent.every((n) => n.deepLink === `paz://presenca/7/${MEETING}`),
      ).toBe(true);
    });

    it('follow-up goes to the co-leader alone when the group has no leader', async () => {
      em.groups = [{ ...baseGroup(), leader: null }];
      await tickAt(sp(FOLLOWUPS[0]));
      expect(sent[0].recipients).toEqual([11]);
    });

    it('sends once to a leader who is also co-leader', async () => {
      em.groups = [{ ...baseGroup(), coLeader: leader }];
      await tickAt(sp(FOLLOWUPS[0]));
      expect(sent[0].recipients).toEqual([10]);
    });

    it('does nothing when attendance is missing (only the primary push logic applies)', async () => {
      em.attendance = [];
      await tickHourly(sp('2026-06-11T00:00:00'), sp('2026-06-16T23:00:00'));
      expect(sent).toHaveLength(0);
    });

    it('lets two concurrent instances produce exactly one follow-up', async () => {
      const a = makeEvaluator();
      const b = makeEvaluator();
      jest.setSystemTime(sp(FOLLOWUPS[0]));
      const now = new Date();
      await Promise.all([a.run(rule, now), b.run(rule, now)]);
      expect(sent).toHaveLength(1);
    });

    it('a meeting more than the look-back ago is not touched', async () => {
      await tickAt(sp('2026-06-25T19:00:00'));
      expect(sent).toHaveLength(0);
    });
  });

  describe('a report completes the reminder for the whole group (leader and co-leader)', () => {
    beforeEach(() => attend());

    it('a report linked via attendance_id silences follow-ups and escalation', async () => {
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: `att-7-${MEETING}`,
        date: '2026-07-30',
      });
      await tickHourly(sp(`${MEETING}T19:00:00`), sp('2026-06-17T20:00:00'));
      expect(sent).toHaveLength(0);
    });

    it('an unlinked legacy report dated within [meeting, +6 days] silences everything', async () => {
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: null,
        date: '2026-06-14',
      });
      await tickHourly(sp(`${MEETING}T19:00:00`), sp('2026-06-17T20:00:00'));
      expect(sent).toHaveLength(0);
    });

    it('the report check is group-based, not author-based: no recorded_by/user filter in the query', async () => {
      // A co-leader's report is just a group report: whoever wrote it, the
      // leader's follow-ups stop (and vice versa).
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: `att-7-${MEETING}`,
        date: MEETING,
        recordedBy: 11,
      });
      await tickAt(sp(FOLLOWUPS[0]));
      await tickAt(sp(ESCALATION));
      expect(sent).toHaveLength(0);
      expect(em.existsWheres.length).toBeGreaterThan(0);
      for (const where of em.existsWheres.flat()) {
        expect(Object.keys(where).sort()).toEqual(
          'attendanceId' in where
            ? ['attendanceId', 'lifeGroupId']
            : ['date', 'lifeGroupId'],
        );
      }
    });

    it('a report filed after the first follow-up stops the remaining follow-ups and the escalation', async () => {
      await tickAt(sp(FOLLOWUPS[0]));
      expect(sent).toHaveLength(1);
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: `att-7-${MEETING}`,
        date: MEETING,
      });
      await tickHourly(sp('2026-06-12T00:00:00'), sp('2026-06-16T23:00:00'));
      expect(sent).toHaveLength(1);
    });

    it('ignores a soft-deleted report and one dated outside the window', async () => {
      em.reports.push(
        {
          lifeGroupId: 7,
          attendanceId: `att-7-${MEETING}`,
          date: MEETING,
          deletedAt: new Date(),
        },
        { lifeGroupId: 7, attendanceId: null, date: '2026-06-17' },
        { lifeGroupId: 7, attendanceId: null, date: '2026-06-09' },
        { lifeGroupId: 8, attendanceId: null, date: MEETING },
      );
      await tickAt(sp(FOLLOWUPS[0]));
      expect(sent).toHaveLength(1);
    });
  });

  describe('escalation to the sector leader at +5 days (+120h)', () => {
    beforeEach(() => attend());

    it('notifies sector leader + sector co-leader with group name, date and the lifegroup deep link', async () => {
      await tickAt(sp(ESCALATION));
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({
        deepLink: 'paz://lifegroup/7',
        category: 'life_group_attendance',
        recipients: [20, 21],
      });
      expect(sent[0].message).toContain('Life Alfa');
      expect(sent[0].message).toContain('10/06');
    });

    it('does not fire at +119h; fires at +120h', async () => {
      await tickAt(sp('2026-06-15T18:00:00'));
      expect(sent).toHaveLength(0);
      await tickAt(sp(ESCALATION));
      expect(sent).toHaveLength(1);
    });

    it('catch-up: +121h and +122h still escalate, +123h does not; once only', async () => {
      await tickAt(sp('2026-06-15T21:00:00')); // +122h
      expect(sent).toHaveLength(1);
      await tickAt(sp('2026-06-15T20:00:00')); // +121h, already claimed
      expect(sent).toHaveLength(1);

      sent.length = 0;
      em.log.clear();
      await tickAt(sp('2026-06-15T22:00:00')); // +123h
      expect(sent).toHaveLength(0);
    });

    it('escalates only once across +120h, +121h and +122h', async () => {
      await tickHourly(sp(ESCALATION), sp('2026-06-15T21:00:00'));
      expect(sent).toHaveLength(1);
    });

    it('a late first tick (+121h) after a lost +120h tick still escalates', async () => {
      await tickAt(sp('2026-06-15T20:00:00'));
      expect(sent).toHaveLength(1);
    });

    it('goes to a lone sector co-leader when the sector has no leader', async () => {
      em.groups = [
        {
          ...baseGroup(),
          sector: { id: 3, leader: null, coLeader: sectorCoLeader },
        },
      ];
      await tickAt(sp(ESCALATION));
      expect(sent[0].recipients).toEqual([21]);
    });

    it('is not sent when the sector has neither leader nor co-leader, or the group has no sector', async () => {
      em.groups = [
        { ...baseGroup(), sector: { id: 3, leader: null, coLeader: null } },
      ];
      await tickAt(sp(ESCALATION));
      em.groups = [{ ...baseGroup(), sector: null }];
      await tickAt(sp(ESCALATION));
      expect(sent).toHaveLength(0);
      expect(em.log.size).toBe(0);
    });

    it('dedupes a sector leader who is also the sector co-leader', async () => {
      em.groups = [
        {
          ...baseGroup(),
          sector: { id: 3, leader: sectorLeader, coLeader: sectorLeader },
        },
      ];
      await tickAt(sp(ESCALATION));
      expect(sent[0].recipients).toEqual([20]);
    });

    it('dedupe key is per (group, meeting date): next week is a new escalation', async () => {
      attend('2026-06-17');
      await tickAt(sp(ESCALATION));
      await tickAt(sp('2026-06-22T19:00:00'));
      expect(sent).toHaveLength(2);
    });

    it('is not sent when attendance is missing (primary push owns that gap)', async () => {
      em.attendance = [];
      await tickAt(sp(ESCALATION));
      expect(sent).toHaveLength(0);
    });

    it('lets two concurrent instances produce exactly one escalation', async () => {
      const a = makeEvaluator();
      const b = makeEvaluator();
      jest.setSystemTime(sp(ESCALATION));
      const now = new Date();
      await Promise.all([a.run(rule, now), b.run(rule, now)]);
      expect(sent).toHaveLength(1);
    });

    it('escalation_after_days is honored (3 days = +72h, and follow-ups stop before it)', async () => {
      const config = { ...rule.config, escalation_after_days: 3 };
      await tickHourly(
        sp(`${MEETING}T19:00:00`),
        sp('2026-06-16T23:00:00'),
        config,
      );
      // follow-ups at +24h, +48h; escalation at +72h
      expect(sent).toHaveLength(3);
      expect(sent[2].deepLink).toBe('paz://lifegroup/7');
    });
  });

  describe('extra meetings', () => {
    it('an extra with attendance and no report gets follow-ups and escalation using its own date and the group meeting_time', async () => {
      // Saturday 2026-06-13 extra at the group meeting_time (19:00 SP)
      attend('2026-06-13', 7, true);
      await tickAt(sp('2026-06-14T18:00:00')); // +23h
      expect(sent).toHaveLength(0);
      await tickAt(sp('2026-06-14T19:00:00'));
      expect(sent).toHaveLength(1);
      expect(sent[0].deepLink).toBe('paz://presenca/7/2026-06-13');
      await tickAt(sp('2026-06-18T19:00:00')); // +120h
      expect(sent).toHaveLength(2);
      expect(sent[1].deepLink).toBe('paz://lifegroup/7');
      expect(sent[1].message).toContain('13/06');
    });

    it('an extra with a report is silent', async () => {
      attend('2026-06-13', 7, true);
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: 'att-7-2026-06-13',
        date: '2026-06-13',
      });
      await tickHourly(sp('2026-06-13T19:00:00'), sp('2026-06-17T20:00:00'));
      expect(sent).toHaveLength(0);
    });

    it('never creates a primary push for an extra: no attendance means no reminder on a non-regular day', async () => {
      await tickHourly(sp('2026-06-13T00:00:00'), sp('2026-06-13T23:00:00')); // Saturday
      expect(sent).toHaveLength(0);
    });

    it('a regular and an extra meeting in the same week are followed up independently', async () => {
      attend();
      attend('2026-06-13', 7, true);
      await tickHourly(sp(`${MEETING}T19:00:00`), sp('2026-06-12T23:00:00'));
      expect(sent).toHaveLength(2); // regular +24h and +48h
      sent.length = 0;
      await tickAt(sp('2026-06-14T19:00:00')); // regular +96h and extra +24h
      expect(sent).toHaveLength(2);
      expect(sent.map((n) => n.deepLink).sort()).toEqual([
        `paz://presenca/7/${MEETING}`,
        'paz://presenca/7/2026-06-13',
      ]);
    });
  });

  describe('groups that must be skipped', () => {
    it.each([
      ['no fixed day', { meetingDay: 'Sem dia fixo' }],
      ['null meeting day', { meetingDay: null }],
      ['null meeting time', { meetingTime: null }],
      ['hour out of range', { meetingTime: '25:70:00' }],
      ['hour 24', { meetingTime: '24:00:00' }],
      ['minute out of range', { meetingTime: '19:60:00' }],
      ['garbage', { meetingTime: 'abc' }],
    ])(
      '%s: no primary push, follow-up or escalation (even with an extra attendance)',
      async (_label, patch) => {
        em.groups = [{ ...baseGroup(), ...patch }];
        attend();
        attend('2026-06-13', 7, true);
        await tickHourly(sp(`${MEETING}T00:00:00`), sp('2026-06-20T20:00:00'));
        expect(sent).toHaveLength(0);
      },
    );

    it('still handles the other groups in the same run', async () => {
      em.groups = [
        { ...baseGroup(), id: 8, meetingDay: 'Sem dia fixo' },
        baseGroup(),
      ];
      attend(MEETING, 8);
      attend();
      await tickAt(sp(FOLLOWUPS[0]));
      expect(sent).toHaveLength(1);
      expect(sent[0].deepLink).toBe(`paz://presenca/7/${MEETING}`);
    });

    it('queries attendance once per run, not once per group', async () => {
      em.groups = [baseGroup(), { ...baseGroup(), id: 9 }];
      await tickAt(sp(FOLLOWUPS[0]));
      expect(em.findCalls).toBe(1);
    });
  });

  describe('config resolution for rows saved before V2', () => {
    it('falls back to the default copy and cadence when the new fields are absent', async () => {
      attend();
      await tickAt(sp(FOLLOWUPS[0])); // legacy row config has no followup_* keys
      expect(sent).toHaveLength(1);
      expect(sent[0].title).toBe('Relatório do Life Group pendente');
    });

    it('uses configured copy when present', async () => {
      attend();
      await tickAt(sp(FOLLOWUPS[0]), evaluator, {
        ...rule.config,
        followup_title: 'Custom',
        followup_message: 'Custom msg',
      });
      expect(sent[0]).toMatchObject({ title: 'Custom', message: 'Custom msg' });
    });
  });
});

describe('LifeGroupAttendanceReminderEvaluator with the flag off', () => {
  const originalFlag = process.env.LIFE_GROUP_MEETING_V2;
  afterEach(() => {
    jest.useRealTimers();
    if (originalFlag === undefined) delete process.env.LIFE_GROUP_MEETING_V2;
    else process.env.LIFE_GROUP_MEETING_V2 = originalFlag;
  });

  it.each([undefined, '', 'false', '0', 'yes'])(
    'LIFE_GROUP_MEETING_V2=%p keeps the legacy behavior: no follow-up, no escalation, legacy copy',
    async (value) => {
      if (value === undefined) delete process.env.LIFE_GROUP_MEETING_V2;
      else process.env.LIFE_GROUP_MEETING_V2 = value;
      jest.useFakeTimers();

      const em = new FakeEm();
      em.groups = [
        {
          id: 7,
          name: 'Life Alfa',
          meetingDay: 'Quarta-feira',
          meetingTime: '19:00:00',
          leader: { id: 10 },
          coLeader: { id: 11 },
          sector: { id: 3, leader: { id: 20 }, coLeader: { id: 21 } },
        },
      ];
      em.attendance.push({
        id: 'a',
        lifeGroupId: 7,
        meetingDate: '2026-06-10',
      });
      // the legacy path never calls exists/insert-claim before dispatch
      const insertSpy = jest.spyOn(em, 'insert');
      const existsSpy = jest.spyOn(em, 'exists');
      const dispatch = { dispatch: jest.fn() };
      const evaluator = new LifeGroupAttendanceReminderEvaluator(
        em as unknown as EntityManager,
        dispatch as unknown as NotificationDispatchService,
      );
      const rule = {
        type: 'life_group_attendance',
        config: {
          hours_after_meeting_start: 2,
          title: 'legacy title',
          message: 'legacy message',
        },
      } as ReminderRule;

      // report missing, attendance saved: legacy sends nothing, ever
      for (const iso of [
        '2026-06-11T09:00:00-03:00',
        '2026-06-15T09:00:00-03:00',
      ]) {
        jest.setSystemTime(new Date(iso));
        await evaluator.run(rule, new Date());
      }
      expect(dispatch.dispatch).not.toHaveBeenCalled();
      expect(insertSpy).not.toHaveBeenCalled();
      expect(existsSpy).not.toHaveBeenCalled();
    },
  );
});
