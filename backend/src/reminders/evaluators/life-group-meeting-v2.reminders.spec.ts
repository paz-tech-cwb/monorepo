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
          a.meetingDate === opts.where.meetingDate,
      ) ?? null,
    );
  }

  exists(entity: unknown, opts: { where: Row[] }): Promise<boolean> {
    if (entity !== LifeGroupReport) throw new Error('unexpected exists');
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

  const attend = (date = MEETING, gid = 7) =>
    em.attendance.push({
      id: `att-${gid}-${date}`,
      lifeGroupId: gid,
      meetingDate: date,
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

  describe('timezone and midnight rollover', () => {
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

    it('follow-up counts days from the meeting date across midnight: day 1 is the 11th at 09:00 SP', async () => {
      em.groups = [{ ...baseGroup(), meetingTime: '22:00:00' }];
      attend();
      await tickAt(new Date('2026-06-11T12:00:00Z'));
      expect(sent).toHaveLength(1);
      expect(sent[0].deepLink).toBe(`paz://presenca/7/${MEETING}`);
    });

    it('follow-up hour is Sao Paulo: 09:00 UTC (06:00 SP) does not fire, 12:00 UTC does', async () => {
      attend();
      await tickAt(new Date('2026-06-11T09:00:00Z'));
      expect(sent).toHaveLength(0);
      await tickAt(new Date('2026-06-11T12:00:00Z'));
      expect(sent).toHaveLength(1);
    });
  });

  describe('follow-up (attendance saved, report missing)', () => {
    beforeEach(() => attend());

    it('fires at 09:00 SP the next morning, not before, and not twice', async () => {
      await tickHourly(sp(`${MEETING}T21:00:00`), sp('2026-06-11T08:00:00'));
      expect(sent).toHaveLength(0);

      await tickAt(sp('2026-06-11T09:00:00'));
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({
        title: 'Relatório do Life Group pendente',
        deepLink: `paz://presenca/7/${MEETING}`,
        category: 'life_group_attendance',
        recipients: [10, 11],
      });

      await tickAt(sp('2026-06-11T09:00:00')); // same hour again (restart / second tick)
      await tickAt(sp('2026-06-11T09:59:00'));
      await tickHourly(sp('2026-06-11T10:00:00'), sp('2026-06-11T23:00:00'));
      expect(sent).toHaveLength(1);
    });

    it('repeats daily at 09:00 for days 1-4 and escalates on day 5 (no leader follow-up that day)', async () => {
      await tickHourly(sp(`${MEETING}T21:00:00`), sp('2026-06-17T20:00:00'));

      const followups = sent.filter((s) =>
        s.deepLink.startsWith('paz://presenca'),
      );
      const escalations = sent.filter((s) =>
        s.deepLink.startsWith('paz://lifegroup'),
      );
      expect(followups).toHaveLength(4);
      expect(followups.every((s) => s.recipients.join() === '10,11')).toBe(
        true,
      );
      expect(escalations).toHaveLength(1);
      expect(escalations[0].recipients).toEqual([20, 21]);
      expect(sent).toHaveLength(5);
      // order: days 1..4 then the escalation on day 5 (06-15), then silence
      expect(em.events.filter((e) => e.startsWith('claim:'))).toEqual([
        `claim:life_group_meeting_followup:7:${MEETING}:1`,
        `claim:life_group_meeting_followup:7:${MEETING}:2`,
        `claim:life_group_meeting_followup:7:${MEETING}:3`,
        `claim:life_group_meeting_followup:7:${MEETING}:4`,
        `claim:life_group_meeting_escalation:7:${MEETING}`,
      ]);
    });

    it('honors followup_interval_days (every 2 days: days 1 and 3, escalation day 5)', async () => {
      const config = { ...rule.config, followup_interval_days: 2 };
      await tickHourly(
        sp('2026-06-10T21:00:00'),
        sp('2026-06-17T20:00:00'),
        config,
      );
      expect(em.events.filter((e) => e.startsWith('claim:'))).toEqual([
        `claim:life_group_meeting_followup:7:${MEETING}:1`,
        `claim:life_group_meeting_followup:7:${MEETING}:3`,
        `claim:life_group_meeting_escalation:7:${MEETING}`,
      ]);
    });

    it('honors followup_max_days as a cap below the escalation day', async () => {
      const config = { ...rule.config, followup_max_days: 2 };
      await tickHourly(
        sp('2026-06-10T21:00:00'),
        sp('2026-06-17T20:00:00'),
        config,
      );
      expect(
        sent.filter((s) => s.deepLink.startsWith('paz://presenca')),
      ).toHaveLength(2);
      expect(
        sent.filter((s) => s.deepLink.startsWith('paz://lifegroup')),
      ).toHaveLength(1);
    });

    it('followup_max_days 0 disables the follow-up but not the escalation', async () => {
      const config = { ...rule.config, followup_max_days: 0 };
      await tickHourly(
        sp('2026-06-10T21:00:00'),
        sp('2026-06-17T20:00:00'),
        config,
      );
      expect(sent).toHaveLength(1);
      expect(sent[0].deepLink).toBe('paz://lifegroup/7');
    });

    it('escalation_after_days 0 disables the escalation and lets follow-ups run to the cap', async () => {
      const config = { ...rule.config, escalation_after_days: 0 };
      await tickHourly(
        sp('2026-06-10T21:00:00'),
        sp('2026-06-17T20:00:00'),
        config,
      );
      expect(sent).toHaveLength(5);
      expect(sent.every((s) => s.deepLink.startsWith('paz://presenca'))).toBe(
        true,
      );
    });

    it('honors followup_hour', async () => {
      const config = { ...rule.config, followup_hour: 18 };
      await tickAt(sp('2026-06-11T09:00:00'), evaluator, config);
      expect(sent).toHaveLength(0);
      await tickAt(sp('2026-06-11T18:00:00'), evaluator, config);
      expect(sent).toHaveLength(1);
    });

    it('stops as soon as the report exists (linked by attendance_id)', async () => {
      await tickAt(sp('2026-06-11T09:00:00'));
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: `att-7-${MEETING}`,
        date: '2026-06-14',
      });
      await tickHourly(sp('2026-06-12T00:00:00'), sp('2026-06-17T20:00:00'));
      expect(sent).toHaveLength(1);
    });

    it('treats an unlinked legacy report dated within the following 6 days as filed', async () => {
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: null,
        date: '2026-06-14',
      });
      await tickHourly(sp('2026-06-11T00:00:00'), sp('2026-06-17T20:00:00'));
      expect(sent).toHaveLength(0);
    });

    it('ignores a soft-deleted report and one dated outside the window', async () => {
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: null,
        date: MEETING,
        deletedAt: new Date(),
      });
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: null,
        date: '2026-06-17',
      });
      await tickAt(sp('2026-06-11T09:00:00'));
      expect(sent).toHaveLength(1);
    });

    it('does nothing when attendance is missing (only the primary push logic applies)', async () => {
      em.attendance = [];
      await tickHourly(sp('2026-06-11T00:00:00'), sp('2026-06-17T20:00:00'));
      expect(sent).toHaveLength(0);
    });

    it('lets two concurrent instances produce exactly one follow-up', async () => {
      const a = makeEvaluator();
      const b = makeEvaluator();
      jest.setSystemTime(sp('2026-06-11T09:00:00'));
      const now = new Date();
      await Promise.all([a.run(rule, now), b.run(rule, now)]);
      expect(sent).toHaveLength(1);
    });

    it('a follow-up failure releases the claim so the same hour can retry', async () => {
      dispatchMock.mockRejectedValueOnce(new Error('fcm down'));
      await tickAt(sp('2026-06-11T09:00:00'));
      expect(sent).toHaveLength(0);
      await tickAt(sp('2026-06-11T09:30:00'));
      expect(sent).toHaveLength(1);
    });

    it('follow-up goes to the co-leader alone when the group has no leader', async () => {
      em.groups = [{ ...baseGroup(), leader: null }];
      await tickAt(sp('2026-06-11T09:00:00'));
      expect(sent[0].recipients).toEqual([11]);
    });
  });

  describe('escalation to the sector leader', () => {
    const ESCALATION_AT = () => sp('2026-06-15T09:00:00'); // day 5 after 2026-06-10

    beforeEach(() => attend());

    it('notifies sector leader + sector co-leader with group name, date and the lifegroup deep link', async () => {
      await tickAt(ESCALATION_AT());
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({
        title: 'Relatório de Life Group pendente',
        message:
          'O Life Group Life Alfa ainda não enviou o relatório da reunião de 10/06.',
        deepLink: 'paz://lifegroup/7',
        category: 'life_group_attendance',
        recipients: [20, 21],
      });
    });

    it('does not fire on day 4 or day 6 (the escalation day is exact)', async () => {
      await tickAt(sp('2026-06-14T09:00:00'));
      await tickAt(sp('2026-06-16T09:00:00'));
      expect(sent.every((s) => s.deepLink.startsWith('paz://presenca'))).toBe(
        true,
      );
      expect(sent.some((s) => s.deepLink === 'paz://lifegroup/7')).toBe(false);
    });

    it('goes to a lone sector co-leader when the sector has no leader', async () => {
      em.groups = [
        {
          ...baseGroup(),
          sector: { id: 3, leader: null, coLeader: sectorCoLeader },
        },
      ];
      await tickAt(ESCALATION_AT());
      expect(sent[0].recipients).toEqual([21]);
    });

    it('is not sent when the sector has neither leader nor co-leader', async () => {
      em.groups = [
        { ...baseGroup(), sector: { id: 3, leader: null, coLeader: null } },
      ];
      await tickAt(ESCALATION_AT());
      expect(sent).toHaveLength(0);
      expect(em.log.size).toBe(0);
    });

    it('is not sent when the group has no sector', async () => {
      em.groups = [{ ...baseGroup(), sector: null }];
      await tickAt(ESCALATION_AT());
      expect(sent).toHaveLength(0);
    });

    it('dedupes a sector leader who is also the sector co-leader', async () => {
      em.groups = [
        {
          ...baseGroup(),
          sector: { id: 3, leader: sectorLeader, coLeader: sectorLeader },
        },
      ];
      await tickAt(ESCALATION_AT());
      expect(sent[0].recipients).toEqual([20]);
    });

    it('dedupe key is per (group, meeting date): same hour twice -> one push, next week -> a new push', async () => {
      await tickAt(ESCALATION_AT());
      await tickAt(ESCALATION_AT());
      expect(sent).toHaveLength(1);

      attend('2026-06-17');
      await tickAt(sp('2026-06-22T09:00:00'));
      expect(sent).toHaveLength(2);
      expect(
        em.log.has(
          'life_group_attendance|life_group_meeting_escalation:7:2026-06-17',
        ),
      ).toBe(true);
      expect(
        em.log.has(
          `life_group_attendance|life_group_meeting_escalation:7:${MEETING}`,
        ),
      ).toBe(true);
    });

    it('is not sent when the report exists, nor when attendance is missing', async () => {
      em.reports.push({
        lifeGroupId: 7,
        attendanceId: null,
        date: '2026-06-12',
      });
      await tickAt(ESCALATION_AT());
      expect(sent).toHaveLength(0);

      em.reports = [];
      em.attendance = [];
      await tickAt(ESCALATION_AT());
      expect(sent).toHaveLength(0);
    });

    it('lets two concurrent instances produce exactly one escalation', async () => {
      const a = makeEvaluator();
      const b = makeEvaluator();
      jest.setSystemTime(ESCALATION_AT());
      const now = new Date();
      await Promise.all([a.run(rule, now), b.run(rule, now)]);
      expect(sent).toHaveLength(1);
    });

    it('is computed in Sao Paulo time (12:00 UTC on the 15th)', async () => {
      await tickAt(new Date('2026-06-15T12:00:00Z'));
      expect(sent).toHaveLength(1);
    });
  });

  describe('groups that must be skipped', () => {
    it.each([
      ['no fixed day', { meetingDay: 'Sem dia fixo' }],
      ['null meeting day', { meetingDay: null }],
      ['null meeting time', { meetingTime: null }],
    ])(
      '%s: no primary push, follow-up or escalation',
      async (_label, patch) => {
        em.groups = [{ ...baseGroup(), ...patch }];
        attend();
        await tickHourly(sp(`${MEETING}T00:00:00`), sp('2026-06-17T20:00:00'));
        expect(sent).toHaveLength(0);
      },
    );

    it('still handles the other groups in the same run', async () => {
      em.groups = [
        { ...baseGroup(), id: 8, meetingDay: 'Sem dia fixo' },
        baseGroup(),
      ];
      await tickAt(sp(`${MEETING}T21:00:00`));
      expect(sent).toHaveLength(1);
      expect(sent[0].deepLink).toBe(`paz://presenca/7/${MEETING}`);
    });
  });

  describe('config resolution for rows saved before V2', () => {
    it('falls back to the default copy and cadence when the new fields are absent', async () => {
      attend();
      await tickAt(sp('2026-06-11T09:00:00')); // legacy row config has no followup_* keys
      expect(sent).toHaveLength(1);
      expect(sent[0].title).toBe('Relatório do Life Group pendente');
    });

    it('uses configured copy when present', async () => {
      attend();
      await tickAt(sp('2026-06-11T09:00:00'), evaluator, {
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
