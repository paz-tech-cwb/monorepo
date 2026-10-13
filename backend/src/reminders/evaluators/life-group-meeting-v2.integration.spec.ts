/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- raw SQL rows and jest mocks are untyped */
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import ormConfig from '../../configs/orm.config';
import { LifeGroupAttendanceReminderEvaluator } from './life-group-attendance-reminder.evaluator';
import { ReminderRule } from '../entities/reminder-rule.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';

/**
 * OPT-IN spec against a REAL PostgreSQL with every migration applied. Skipped
 * unless REMINDERS_PG_PORT is set, so `npm test` never needs a database:
 *
 *   REMINDERS_PG_HOST=127.0.0.1 REMINDERS_PG_PORT=5432 REMINDERS_PG_USER=... \
 *   REMINDERS_PG_PASSWORD=... REMINDERS_PG_DB=... \
 *   npx jest life-group-meeting-v2.integration
 *
 * Verifies, on real SQL, what the in-memory double cannot: the group query with
 * the sector/leader joins, `exists` on life_group_reports (attendance link, date
 * window, soft delete) and the unique-index claim in reminder_dispatch_log
 * under real concurrency. Seeds its own fixtures (ids 9201+) and removes them.
 * Use a throwaway database.
 */
const enabled = !!process.env.REMINDERS_PG_PORT;
const maybe = enabled ? describe : describe.skip;

maybe('life_group_attendance v2 reminders (real PostgreSQL)', () => {
  let ds: DataSource;
  let moduleRef: Awaited<
    ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>
  >;
  const sent: Array<{ deepLink: string; recipients: number[]; title: string }> =
    [];
  const dispatch = {
    dispatch: jest.fn((n: any, users: any[]) => {
      sent.push({
        deepLink: n.deepLink,
        title: n.title,
        recipients: users.map((u) => u.id).sort((a, b) => a - b),
      });
      return Promise.resolve();
    }),
  };
  const rule = {
    type: 'life_group_attendance',
    config: { hours_after_meeting_start: 2, title: 'l', message: 'l' },
  } as ReminderRule;
  const sp = (iso: string) => new Date(`${iso}-03:00`);
  const original = process.env.LIFE_GROUP_MEETING_V2;

  const evaluator = () =>
    new LifeGroupAttendanceReminderEvaluator(
      ds.manager,
      dispatch as unknown as NotificationDispatchService,
    );
  const count = async (sql: string) => Number((await ds.query(sql))[0].c);

  async function clean() {
    await ds.query(`
      DELETE FROM reminder_dispatch_log WHERE dedupe_key LIKE '%:9201:%' OR dedupe_key LIKE '%:9202:%';
      DELETE FROM life_group_reports WHERE life_group_id BETWEEN 9201 AND 9202;
      DELETE FROM life_group_attendance WHERE life_group_id BETWEEN 9201 AND 9202;
    `);
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...ormConfig,
          host: process.env.REMINDERS_PG_HOST ?? '127.0.0.1',
          port: Number(process.env.REMINDERS_PG_PORT),
          username: process.env.REMINDERS_PG_USER,
          password: process.env.REMINDERS_PG_PASSWORD,
          database: process.env.REMINDERS_PG_DB,
          synchronize: false,
          migrationsRun: false,
          logging: false,
        } as never),
      ],
    }).compile();
    ds = moduleRef.get(DataSource);
    await ds.query(`
      INSERT INTO users (id, name, role_id) VALUES
       (9201,'Leader',6),(9202,'CoLeader',6),(9203,'SectorLeader',4),(9204,'SectorCo',6)
      ON CONFLICT DO NOTHING;
      INSERT INTO areas (id,name,church_id) VALUES (9201,'A',1) ON CONFLICT DO NOTHING;
      INSERT INTO sectors (id,name,area_id,leader_id,co_leader_id) VALUES (9201,'S',9201,9203,9204) ON CONFLICT DO NOTHING;
      INSERT INTO life_groups (id,name,leader_id,co_leader_id,"sectorId",meeting_day,meeting_time) VALUES
       (9201,'Life Alfa',9201,9202,9201,'Quarta-feira','19:00:00'),
       (9202,'Sem dia',9201,NULL,9201,'Sem dia fixo','19:00:00')
      ON CONFLICT DO NOTHING;
    `);
    process.env.LIFE_GROUP_MEETING_V2 = 'true';
  });

  beforeEach(async () => {
    sent.length = 0;
    dispatch.dispatch.mockClear();
    await clean();
  });

  afterAll(async () => {
    await clean();
    await ds.query(`
      DELETE FROM life_groups WHERE id BETWEEN 9201 AND 9202;
      DELETE FROM sectors WHERE id = 9201;
      DELETE FROM areas WHERE id = 9201;
      DELETE FROM users WHERE id BETWEEN 9201 AND 9204;
    `);
    if (original === undefined) delete process.env.LIFE_GROUP_MEETING_V2;
    else process.env.LIFE_GROUP_MEETING_V2 = original;
    await moduleRef.close();
  });

  const attendanceId = '00000000-0000-0000-0000-00000000a201';
  async function seedAttendance() {
    await ds.query(
      `INSERT INTO life_group_attendance (id, life_group_id, meeting_date, recorded_by) VALUES ($1, 9201, '2026-06-10', 9201)`,
      [attendanceId],
    );
  }
  async function seedReport(opts: {
    linked: boolean;
    date: string;
    deleted?: boolean;
  }) {
    await ds.query(
      `INSERT INTO life_group_reports (date, area_id, sector_id, life_group_id, committed_members, committed_members_present, kids_0_to_11, guests, mdas, offering, committed_at_tadel, committed_at_culto, disciples_count, disciples_discipled_this_week, pastoring_activity_type, training_activity_type, leader_attended, "submittedById", attendance_id, deleted_at)
       VALUES ($1, 9201, 9201, 9201, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, '{}', '{}', '{}', 9201, $2, $3)`,
      [
        opts.date,
        opts.linked ? attendanceId : null,
        opts.deleted ? new Date() : null,
      ],
    );
  }

  it('primary push when attendance is missing, claimed once under real concurrency', async () => {
    await Promise.all([
      evaluator().run(rule, sp('2026-06-10T21:00:00')),
      evaluator().run(rule, sp('2026-06-10T21:00:00')),
      evaluator().run(rule, sp('2026-06-10T21:00:00')),
    ]);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      deepLink: 'paz://presenca/9201/2026-06-10',
      recipients: [9201, 9202],
    });
    expect(
      await count(
        `SELECT count(*) AS c FROM reminder_dispatch_log WHERE dedupe_key='life_group_attendance:9201:2026-06-10'`,
      ),
    ).toBe(1);
  });

  it('follow-up (attendance, no report) once at 09:00 SP, then the day-5 escalation to sector leader + co-leader', async () => {
    await seedAttendance();
    await evaluator().run(rule, sp('2026-06-11T08:00:00'));
    expect(sent).toHaveLength(0);
    await Promise.all([
      evaluator().run(rule, sp('2026-06-11T09:00:00')),
      evaluator().run(rule, sp('2026-06-11T09:00:00')),
    ]);
    expect(sent).toHaveLength(1);
    expect(sent[0].recipients).toEqual([9201, 9202]);

    await evaluator().run(rule, sp('2026-06-15T09:00:00'));
    expect(sent).toHaveLength(2);
    expect(sent[1]).toMatchObject({
      deepLink: 'paz://lifegroup/9201',
      recipients: [9203, 9204],
    });
    expect(sent[1].title).toBe('Relatório de Life Group pendente');
  });

  it.each([
    ['linked by attendance_id', { linked: true, date: '2026-06-20' }],
    ['unlinked, dated the meeting day', { linked: false, date: '2026-06-10' }],
    ['unlinked, dated 6 days later', { linked: false, date: '2026-06-16' }],
  ])(
    'a report %s stops the follow-up and the escalation',
    async (_n, report) => {
      await seedAttendance();
      await seedReport(report);
      await evaluator().run(rule, sp('2026-06-11T09:00:00'));
      await evaluator().run(rule, sp('2026-06-15T09:00:00'));
      expect(sent).toHaveLength(0);
    },
  );

  it('a soft-deleted report, or one dated after the 6-day window, does not count', async () => {
    await seedAttendance();
    await seedReport({ linked: false, date: '2026-06-10', deleted: true });
    await seedReport({ linked: false, date: '2026-06-17' });
    await evaluator().run(rule, sp('2026-06-11T09:00:00'));
    expect(sent).toHaveLength(1);
  });

  it('skips the group without a fixed day', async () => {
    await ds.query(
      `INSERT INTO life_group_attendance (life_group_id, meeting_date, recorded_by) VALUES (9202, '2026-06-10', 9201)`,
    );
    await evaluator().run(rule, sp('2026-06-11T09:00:00'));
    await evaluator().run(rule, sp('2026-06-10T21:00:00'));
    expect(sent.every((s) => !s.deepLink.includes('9202'))).toBe(true);
  });
});
