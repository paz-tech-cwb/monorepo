/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- test double / supertest bodies are untyped */
import {
  ExecutionContext,
  INestApplication,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import ormConfig from '../configs/orm.config';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../common/constants/global-validation-pipe-options';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { LifeGroupAttendanceModule } from '../life-group-attendance/life-group-attendance.module';
import { LifeGroupReportsModule } from '../life-group-reports/life-group-reports.module';
import { User } from '../users/entities/user.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupTaskRosterService } from '../life-group-tasks/life-group-task-roster.service';
import { LifeGroupMeetingsModule } from './life-group-meetings.module';
import {
  zonedParts,
  dateKeyOf,
  shiftDays,
} from '../life-group-attendance/meeting-day.util';

/**
 * OPT-IN integration spec against a REAL PostgreSQL that already has every
 * migration applied (including 1796000000000 and 1796000000001). Skipped unless
 * MEETINGS_PG_PORT is set, so the default `npm test` never needs a database:
 *
 *   MEETINGS_PG_HOST=127.0.0.1 MEETINGS_PG_PORT=5432 MEETINGS_PG_USER=... \
 *   MEETINGS_PG_PASSWORD=... MEETINGS_PG_DB=... npx jest life-group-meetings.integration
 *
 * It seeds its own fixtures (ids 9001+/91xx) and removes them afterwards. Use a
 * throwaway database.
 */
const enabled = !!process.env.MEETINGS_PG_PORT;
const maybe = enabled ? describe : describe.skip;

const INDEX = 'uq_life_group_reports_group_date_active';

function wednesday(weeksAgo: number): string {
  // Most recent Wednesday on/before today (church zone), minus N weeks.
  let key = dateKeyOf(zonedParts(new Date()));
  for (;;) {
    const [y, m, d] = key.split('-').map(Number);
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 3) break;
    key = dateKeyOf(shiftDays({ year: y, month: m, day: d }, -1));
  }
  const [y, m, d] = key.split('-').map(Number);
  return dateKeyOf(shiftDays({ year: y, month: m, day: d }, -7 * weeksAgo));
}

// Wednesday-relative date (church zone): wed(n) + offsetDays.
function around(weeksAgo: number, offsetDays: number): string {
  const [y, m, d] = wednesday(weeksAgo).split('-').map(Number);
  return dateKeyOf(shiftDays({ year: y, month: m, day: d }, offsetDays));
}

const report = {
  kids_0_to_11: 2,
  guests: 1,
  mdas: 3,
  offering: '12.50',
  committed_at_tadel: 4,
  committed_at_culto: 5,
  leader_attended: ['tadel'],
  disciples_count: 6,
  disciples_discipled_this_week: 2,
  pastoring_activity_type: ['visita'],
  training_activity_type: [],
};
const att = (present: boolean[] = [true, false, true]) => ({
  entries: [9103, 9104, 9105].map((user_id, i) => ({
    user_id,
    present: present[i],
  })),
});

maybe('life-group-meetings (real PostgreSQL)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const THIS_WEEK = wednesday(0);
  const OLD = wednesday(5);

  const as = (userId: number) => ({ 'x-test-user': String(userId) });
  const http = () => request(app.getHttpServer());
  const meetingUrl = (group: number, date: string) =>
    `/life-groups/${group}/meetings/${date}`;
  const count = async (table: string, where = 'true') =>
    Number(
      (
        await ds.query(`SELECT count(*)::int AS c FROM ${table} WHERE ${where}`)
      )[0].c,
    );

  async function clean() {
    await ds.query(
      `DELETE FROM form_submission_audit_log WHERE form_slug IN ('life_group_attendance','life-group-reports') AND "actorId" BETWEEN 9100 AND 9199`,
    );
    await ds.query(
      `DELETE FROM life_group_reports WHERE life_group_id BETWEEN 9001 AND 9005`,
    );
    await ds.query(
      `DELETE FROM life_group_attendance WHERE life_group_id BETWEEN 9001 AND 9005`,
    );
  }

  async function ensureIndex() {
    await ds.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ${INDEX} ON life_group_reports (life_group_id, date) WHERE deleted_at IS NULL`,
    );
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...ormConfig,
          host: process.env.MEETINGS_PG_HOST ?? '127.0.0.1',
          port: Number(process.env.MEETINGS_PG_PORT),
          username: process.env.MEETINGS_PG_USER,
          password: process.env.MEETINGS_PG_PASSWORD,
          database: process.env.MEETINGS_PG_DB,
          synchronize: false,
          migrationsRun: false,
          logging: false,
        } as never),
        FormsCoreModule,
        LifeGroupAttendanceModule,
        LifeGroupReportsModule,
        LifeGroupMeetingsModule,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: async (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<{
            headers: Record<string, string>;
            user?: unknown;
          }>();
          req.user = await ds.getRepository(User).findOne({
            where: { id: Number(req.headers['x-test-user']) },
            relations: ['role'],
          });
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector), {
        strategy: 'excludeAll',
        excludeExtraneousValues: true,
      }),
    );
    await app.init();
    ds = app.get(DataSource);

    await ds.query(`
      INSERT INTO users (id, name, role_id) VALUES
       (9101,'Leader',6),(9102,'CoLeader',6),(9103,'Ana',6),(9104,'Bruno',6),(9105,'Carla',6),
       (9106,'AreaSup',3),(9107,'SectorSup',4),(9108,'OtherLeader',5),(9109,'Admin',1),
       (9110,'Pastor',2),(9111,'Outsider',6),(9112,'OtherAreaSup',3)
      ON CONFLICT DO NOTHING;
      INSERT INTO areas (id,name,church_id,leader_id) VALUES (9001,'A1',1,9106),(9002,'A2',1,9112) ON CONFLICT DO NOTHING;
      INSERT INTO sectors (id,name,area_id,leader_id) VALUES (9001,'S1',9001,9107),(9002,'S2',9002,NULL),(9003,'S3 no area',NULL,NULL) ON CONFLICT DO NOTHING;
      INSERT INTO life_groups (id,name,leader_id,co_leader_id,"sectorId",meeting_day) VALUES
       (9001,'G1',9101,9102,9001,'Quarta-feira'),
       (9002,'NoSector',9101,NULL,NULL,'Quarta-feira'),
       (9003,'Other',9108,NULL,9001,'Quarta-feira'),
       (9004,'G4',9101,NULL,9001,'Quarta-feira'),
       (9005,'SectorNoArea',9101,NULL,9003,'Quarta-feira')
      ON CONFLICT DO NOTHING;
      INSERT INTO user_life_groups (user_id,life_group_id) VALUES
       (9103,9001),(9104,9001),(9105,9001),(9103,9002),(9103,9004),(9103,9005)
      ON CONFLICT DO NOTHING;
    `);
    await clean();
    await ensureIndex();
  });

  beforeEach(async () => {
    await ensureIndex();
    await clean();
  });

  afterAll(async () => {
    await clean();
    await ds.query(`
      DELETE FROM user_life_groups WHERE life_group_id BETWEEN 9001 AND 9005;
      DELETE FROM life_groups WHERE id BETWEEN 9001 AND 9005;
      DELETE FROM sectors WHERE id BETWEEN 9001 AND 9003;
      DELETE FROM areas WHERE id BETWEEN 9001 AND 9002;
      DELETE FROM users WHERE id BETWEEN 9101 AND 9112;
    `);
    await ensureIndex();
    await app.close();
  });

  describe('authorization matrix with the REAL scope resolver', () => {
    // [name, user, group, canRead, canWrite]: supervisors are read-only (D11).
    it.each([
      ['leader (role member)', 9101, 9001, true, true],
      ['co-leader (role member)', 9102, 9001, true, true],
      ['leader of two groups (second)', 9101, 9004, true, true],
      ['area supervisor in scope (read-only)', 9106, 9001, true, false],
      ['sector supervisor in scope (read-only)', 9107, 9001, true, false],
      ['supervisor of ANOTHER area', 9112, 9001, false, false],
      ['plain roster member', 9103, 9001, false, false],
      ['outsider', 9111, 9001, false, false],
      ["other group's leader", 9108, 9001, false, false],
      ['admin', 9109, 9001, true, true],
      ['pastor', 9110, 9001, true, true],
    ])('%s', async (_n, user, group, canRead, canWrite) => {
      const get = await http().get(meetingUrl(group, THIS_WEEK)).set(as(user));
      expect(get.status).toBe(canRead ? 200 : 403);
      if (canRead) {
        expect(get.body.can_write).toBe(canWrite);
        expect(get.body.can_edit).toBe(canWrite);
      }
      const put = await http()
        .put(meetingUrl(group, THIS_WEEK))
        .set(as(user))
        .send({
          attendance:
            group === 9001
              ? att()
              : { entries: [{ user_id: 9103, present: true }] },
        });
      expect(put.status).toBe(canWrite ? 200 : 403);
      if (canRead && !canWrite) {
        expect(put.body.code).toBe('meeting_write_forbidden');
      }
      expect(
        await count('life_group_attendance', `life_group_id=${group}`),
      ).toBe(canWrite ? 1 : 0);
    });
  });

  it('creates both halves, derives fields, links attendance, writes audit rows (same txn)', async () => {
    const res = await http()
      .put(meetingUrl(9001, THIS_WEEK))
      .set(as(9101))
      .send({ attendance: att(), report })
      .expect(200);
    expect(res.body.report).toMatchObject({
      area_id: 9001,
      sector_id: 9001,
      life_group_id: 9001,
      date: THIS_WEEK,
      committed_members: 3,
      committed_members_present: 2,
      offering: '12.50',
      submitted_by: { id: 9101, name: 'Leader' },
    });
    const [row] = await ds.query(
      `SELECT r.attendance_id, a.id AS att FROM life_group_reports r JOIN life_group_attendance a ON a.life_group_id=r.life_group_id AND a.meeting_date=r.date WHERE r.life_group_id=9001`,
    );
    expect(row.attendance_id).toBe(row.att);
    expect(
      await count(
        'form_submission_audit_log',
        `"actorId"=9101 AND form_slug IN ('life_group_attendance','life-group-reports')`,
      ),
    ).toBe(2);
    expect(await count('life_group_attendance_entries')).toBeGreaterThanOrEqual(
      3,
    );
  });

  it('409 for report-only PUT, 422 for groups without sector/area, nothing written', async () => {
    const r409 = await http()
      .put(meetingUrl(9001, THIS_WEEK))
      .set(as(9101))
      .send({ report })
      .expect(409);
    expect(r409.body.code).toBe('attendance_required');
    for (const g of [9002, 9005]) {
      await http()
        .put(meetingUrl(g, THIS_WEEK))
        .set(as(9101))
        .send({ attendance: att(), report })
        .expect(422);
    }
    expect(
      await count('life_group_attendance', 'life_group_id IN (9002,9005)'),
    ).toBe(0);
  });

  it('edit window against the real clock: old meeting denied for leader, allowed for admin', async () => {
    await http()
      .put(meetingUrl(9001, OLD))
      .set(as(9101))
      .send({ attendance: att() })
      .expect(403);
    await http()
      .put(meetingUrl(9001, OLD))
      .set(as(9109))
      .send({ attendance: att(), report })
      .expect(200);
    await http().get(meetingUrl(9001, OLD)).set(as(9101)).expect(200);
  });

  describe('concurrency', () => {
    const requests = (n: number, body: object, user = 9101) =>
      Array.from({ length: n }, () =>
        http().put(meetingUrl(9001, THIS_WEEK)).set(as(user)).send(body),
      );
    const parallel = (n: number, body: object, user = 9101) =>
      Promise.all(requests(n, body, user));

    it('N parallel combined PUTs -> exactly one attendance and one report row (index present)', async () => {
      const results = await parallel(8, { attendance: att(), report });
      expect(results.map((r) => r.status)).toEqual(Array(8).fill(200));
      expect(await count('life_group_attendance', 'life_group_id=9001')).toBe(
        1,
      );
      expect(await count('life_group_reports', 'life_group_id=9001')).toBe(1);
      expect(
        await count(
          'life_group_attendance_entries',
          'attendance_id IN (SELECT id FROM life_group_attendance WHERE life_group_id=9001)',
        ),
      ).toBe(3);
    });

    it('combined PUTs WITHOUT the unique index still give one row each (attendance unique key + lock)', async () => {
      await ds.query(`DROP INDEX IF EXISTS ${INDEX}`);
      try {
        const results = await parallel(8, { attendance: att(), report });
        expect(results.map((r) => r.status)).toEqual(Array(8).fill(200));
        expect(await count('life_group_attendance', 'life_group_id=9001')).toBe(
          1,
        );
        expect(await count('life_group_reports', 'life_group_id=9001')).toBe(1);
      } finally {
        await clean();
        await ensureIndex();
      }
    });

    it('report-only PUTs racing on an existing attendance, WITHOUT the index: the lock keeps one report row', async () => {
      await http()
        .put(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .send({ attendance: att() })
        .expect(200);
      await ds.query(`DROP INDEX IF EXISTS ${INDEX}`);
      try {
        const results = await parallel(10, { report });
        expect(results.map((r) => r.status)).toEqual(Array(10).fill(200));
        expect(await count('life_group_reports', 'life_group_id=9001')).toBe(1);
      } finally {
        await clean();
        await ensureIndex();
      }
    });

    it('mixed: legacy attendance PUT racing meetings PUTs still yields one attendance row', async () => {
      const legacy = Array.from({ length: 4 }, () =>
        http()
          .put(`/life-groups/9001/attendance/${THIS_WEEK}`)
          .set(as(9101))
          .send(att()),
      );
      const results = await Promise.all([
        ...legacy,
        ...requests(4, { attendance: att(), report }),
      ]);
      for (const r of results) expect([200, 201, 409]).toContain(r.status);
      expect(await count('life_group_attendance', 'life_group_id=9001')).toBe(
        1,
      );
      expect(
        await count('life_group_reports', 'life_group_id=9001'),
      ).toBeLessThanOrEqual(1);
    });
  });

  describe('report-only PUT vs concurrent legacy attendance change', () => {
    it('waits for an in-flight attendance write and snapshots its committed counts', async () => {
      await clean();
      await http()
        .put(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .send({ attendance: att() })
        .expect(200);
      const [{ members_count: before }] = await ds.query(
        `SELECT members_count FROM life_group_attendance WHERE life_group_id=9001`,
      );
      // Simulates a legacy attendance PUT mid-flight: row updated, not committed.
      const holder = ds.createQueryRunner();
      await holder.connect();
      await holder.startTransaction();
      try {
        await holder.query(
          `UPDATE life_group_attendance SET members_count = $1, present_count = $2 WHERE life_group_id=9001`,
          [before + 7, 5],
        );
        let done = false;
        const pending = http()
          .put(meetingUrl(9001, THIS_WEEK))
          .set(as(9101))
          .send({ report })
          .then((r) => {
            done = true;
            return r;
          });
        await new Promise((r) => setTimeout(r, 700));
        expect(done).toBe(false); // blocked on the attendance row
        await holder.commitTransaction();
        const res = await pending;
        expect(res.status).toBe(200);
      } finally {
        if (holder.isTransactionActive) await holder.rollbackTransaction();
        await holder.release();
      }
      const [row] = await ds.query(
        `SELECT committed_members, committed_members_present FROM life_group_reports WHERE life_group_id=9001`,
      );
      expect(row.committed_members).toBe(before + 7);
      expect(row.committed_members_present).toBe(5);
      await clean();
    });
  });

  describe('extra meetings (is_extra, migration 1796000000001)', () => {
    // Tuesday before last Wednesday: inside the 14-day window, in the past.
    const TUE = around(1, -1);
    const put = (date: string, body: object, user = 9101, group = 9001) =>
      http().put(meetingUrl(group, date)).set(as(user)).send(body);

    it('non-fixed weekday: 400 without the flag, 200 with it; is_extra persisted and exposed', async () => {
      const bad = await put(TUE, { attendance: att() }).expect(400);
      expect(bad.body.code).toBe('extra_meeting_required');
      expect(bad.body.message).toContain('extra_meeting');
      expect(await count('life_group_attendance', 'life_group_id=9001')).toBe(
        0,
      );
      const ok = await put(TUE, {
        attendance: att(),
        report,
        extra_meeting: true,
      }).expect(200);
      expect(ok.body.attendance.is_extra).toBe(true);
      expect(ok.body.report.committed_members).toBe(3);
      expect(
        await count(
          'life_group_attendance',
          `life_group_id=9001 AND meeting_date='${TUE}' AND is_extra = true`,
        ),
      ).toBe(1);
      const get = await http().get(meetingUrl(9001, TUE)).set(as(9101));
      expect(get.body.attendance).toMatchObject({
        is_extra: true,
        is_draft: false,
        members_count: 3,
      });
      // Roster snapshot kept: a member who joins later is not added on edit.
      expect(
        await count(
          'life_group_attendance_entries',
          `attendance_id IN (SELECT id FROM life_group_attendance WHERE life_group_id=9001)`,
        ),
      ).toBe(3);
    });

    it('immutability and misuse of the flag', async () => {
      await put(TUE, { attendance: att(), extra_meeting: true }).expect(200);
      // omitted keeps it
      const kept = await put(TUE, { attendance: att([false, false, false]) });
      expect(kept.status).toBe(200);
      expect(kept.body.attendance).toMatchObject({
        is_extra: true,
        present_count: 0,
      });
      const flip = await put(TUE, {
        attendance: att(),
        extra_meeting: false,
      }).expect(400);
      expect(flip.body.code).toBe('extra_meeting_immutable');
      // regular day: flag rejected, regular record cannot become extra
      const reg = await put(THIS_WEEK, {
        attendance: att(),
        extra_meeting: true,
      }).expect(400);
      expect(reg.body.code).toBe('extra_meeting_on_regular_day');
      await put(THIS_WEEK, { attendance: att() }).expect(200);
      await put(THIS_WEEK, { attendance: att(), extra_meeting: true }).expect(
        400,
      );
      // group without a fixed weekday: flag not applicable
      await ds.query(`UPDATE life_groups SET meeting_day=NULL WHERE id=9004`);
      try {
        const na = await put(
          TUE,
          {
            attendance: { entries: [{ user_id: 9103, present: true }] },
            extra_meeting: true,
          },
          9101,
          9004,
        ).expect(400);
        expect(na.body.code).toBe('extra_meeting_not_applicable');
      } finally {
        await ds.query(
          `UPDATE life_groups SET meeting_day='Quarta-feira' WHERE id=9004`,
        );
      }
    });

    it('the OLD attendance endpoint keeps rejecting non-fixed weekdays (unchanged message) but can still edit a saved extra', async () => {
      const old = await http()
        .put(`/life-groups/9001/attendance/${TUE}`)
        .set(as(9101))
        .send(att())
        .expect(400);
      expect(old.body.message).toMatch(/is not a Quarta-feira/);
      expect(old.body.message).not.toMatch(/extra_meeting/);
      await put(TUE, { attendance: att(), extra_meeting: true }).expect(200);
      const edit = await http()
        .put(`/life-groups/9001/attendance/${TUE}`)
        .set(as(9101))
        .send(att([false, true, true]))
        .expect(200);
      expect(edit.body).toMatchObject({ present_count: 2 });
      // The legacy shape is unchanged (no is_extra key); the flag stays set.
      expect(edit.body).not.toHaveProperty('is_extra');
      expect(
        await count(
          'life_group_attendance',
          `life_group_id=9001 AND meeting_date='${TUE}' AND is_extra = true`,
        ),
      ).toBe(1);
    });

    it('GET draft: 400 without ?extra_meeting=true on a non-fixed weekday, extra draft with it', async () => {
      await http().get(meetingUrl(9001, TUE)).set(as(9101)).expect(400);
      const res = await http()
        .get(`${meetingUrl(9001, TUE)}?extra_meeting=true`)
        .set(as(9101))
        .expect(200);
      expect(res.body.attendance).toMatchObject({
        is_draft: true,
        is_extra: true,
      });
    });

    it('cap: 4 parallel extras on different dates of one ISO week -> exactly 3 saved, 1 answered 409', async () => {
      const dates = [
        around(1, -1), // Tue
        around(1, 1), // Thu
        around(1, 2), // Fri
        around(1, 3), // Sat
      ];
      const results = await Promise.all(
        dates.map((d) => put(d, { attendance: att(), extra_meeting: true })),
      );
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([200, 200, 200, 409]);
      expect(results.find((r) => r.status === 409)?.body.code).toBe(
        'extra_meeting_limit_reached',
      );
      expect(
        await count(
          'life_group_attendance',
          'life_group_id=9001 AND is_extra = true',
        ),
      ).toBe(3);
    });

    it('year boundary (ISO week 2025-12-29..2026-01-04): cap and eligibility treat the week as one, across the year change', async () => {
      await ds.query(
        `UPDATE user_life_groups SET joined_at = '2000-01-01' WHERE life_group_id = 9001`,
      );
      const a = { attendance: att([true, false, false]) };
      // Group 9001 meets on Wednesday: 2025-12-31 is the regular day.
      await put('2025-12-31', a, 9109).expect(200);
      for (const d of ['2025-12-29', '2026-01-01', '2026-01-04']) {
        await put(d, { ...a, extra_meeting: true }, 9109).expect(200);
      }
      // 4th extra of that ISO week -> cap (it spans Dec 2025 and Jan 2026).
      const over = await put(
        '2025-12-30',
        { ...a, extra_meeting: true },
        9109,
      ).expect(409);
      expect(over.body.code).toBe('extra_meeting_limit_reached');
      // Monday of the next ISO week is counted separately.
      await put('2026-01-05', { ...a, extra_meeting: true }, 9109).expect(200);
      const roster = new LifeGroupTaskRosterService(ds.manager);
      const group = await ds.manager.findOneOrFail(LifeGroup, {
        where: { id: 9001 },
        relations: ['leader', 'coLeader', 'users'],
      });
      const { members } = await roster.resolveRoster(group);
      // 9103: 1 regular + 3 extras in the boundary week (only the earliest,
      // 2025-12-29, counts) + 1 extra in the next week = 3.
      expect(members.find((m) => m.user.id === 9103)?.presentCount).toBe(3);
    });

    it('task eligibility counts at most ONE extra meeting per ISO week (regular always)', async () => {
      await ds.query(
        `UPDATE user_life_groups SET joined_at = '2000-01-01' WHERE life_group_id = 9001`,
      );
      const a = { attendance: att([true, false, false]) };
      // Admin: these dates are past the leader's edit window.
      await put(around(2, 0), a, 9109).expect(200); // regular
      await put(around(2, -1), { ...a, extra_meeting: true }, 9109).expect(200);
      await put(around(2, 1), { ...a, extra_meeting: true }, 9109).expect(200);
      await put(around(3, 2), { ...a, extra_meeting: true }, 9109).expect(200);
      const roster = new LifeGroupTaskRosterService(ds.manager);
      const group = await ds.manager.findOneOrFail(LifeGroup, {
        where: { id: 9001 },
        relations: ['leader', 'coLeader', 'users'],
      });
      const { members } = await roster.resolveRoster(group);
      // 9103 was present in 4 meetings: 1 regular + 2 extras in one week
      // (only 1 counts) + 1 extra in another week = 3.
      expect(members.find((m) => m.user.id === 9103)?.presentCount).toBe(3);
    });
  });

  describe('transaction rollback', () => {
    it('a DB error on the report insert (NUL byte in text[]) rolls back the attendance', async () => {
      const res = await http()
        .put(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .send({
          attendance: att(),
          report: { ...report, leader_attended: ['bad\u0000value'] },
        });
      expect(res.status).toBe(500);
      expect(await count('life_group_attendance', 'life_group_id=9001')).toBe(
        0,
      );
      expect(await count('life_group_reports', 'life_group_id=9001')).toBe(0);
      expect(await count('form_submission_audit_log', `"actorId"=9101`)).toBe(
        0,
      );
    });

    it('a failing report audit insert rolls back attendance, report and the attendance audit row', async () => {
      const audit = app.get(FormSubmissionAuditService);
      const original = audit.record.bind(audit);
      const spy = jest
        .spyOn(audit, 'record')
        .mockImplementation((params, manager) =>
          params.formSlug === 'life-group-reports'
            ? Promise.reject(new Error('audit down'))
            : original(params, manager),
        );
      try {
        await http()
          .put(meetingUrl(9001, THIS_WEEK))
          .set(as(9101))
          .send({ attendance: att(), report })
          .expect(500);
      } finally {
        spy.mockRestore();
      }
      expect(await count('life_group_attendance', 'life_group_id=9001')).toBe(
        0,
      );
      expect(await count('life_group_reports', 'life_group_id=9001')).toBe(0);
      expect(await count('form_submission_audit_log', `"actorId"=9101`)).toBe(
        0,
      );
    });
  });

  describe('report snapshot re-sync', () => {
    it('OLD attendance PUT re-syncs the linked report; GET reflects it', async () => {
      await http()
        .put(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .send({ attendance: att(), report })
        .expect(200);
      await http()
        .put(`/life-groups/9001/attendance/${THIS_WEEK}`)
        .set(as(9102))
        .send(att([false, false, false]))
        .expect(200);
      const [row] = await ds.query(
        `SELECT committed_members, committed_members_present FROM life_group_reports WHERE life_group_id=9001`,
      );
      expect(row).toEqual({
        committed_members: 3,
        committed_members_present: 0,
      });
      const view = await http()
        .get(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .expect(200);
      expect(view.body.report.committed_members_present).toBe(0);
      expect(
        await count(
          'form_submission_audit_log',
          `form_slug='life-group-reports' AND "actorId"=9102 AND action='update'`,
        ),
      ).toBe(1);
    });

    it('an unlinked legacy report is left alone by an attendance-only change', async () => {
      await ds.query(
        `INSERT INTO life_group_reports (date,area_id,sector_id,life_group_id,committed_members,committed_members_present,kids_0_to_11,guests,mdas,committed_at_tadel,committed_at_culto,disciples_count,disciples_discipled_this_week,pastoring_activity_type,training_activity_type,"submittedById")
         VALUES ($1,9001,9001,9001,9,9,0,0,0,0,0,0,0,'{}','{}',9101)`,
        [THIS_WEEK],
      );
      await http()
        .put(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .send({ attendance: att() })
        .expect(200);
      const [row] = await ds.query(
        `SELECT committed_members, committed_members_present, attendance_id FROM life_group_reports WHERE life_group_id=9001`,
      );
      expect(row).toEqual({
        committed_members: 9,
        committed_members_present: 9,
        attendance_id: null,
      });
    });
  });

  describe('database constraints and dirty data', () => {
    it('deleting the attendance row nulls the report link (ON DELETE SET NULL)', async () => {
      await http()
        .put(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .send({ attendance: att(), report })
        .expect(200);
      await ds.query(
        `DELETE FROM life_group_attendance WHERE life_group_id=9001`,
      );
      const [row] = await ds.query(
        `SELECT attendance_id FROM life_group_reports WHERE life_group_id=9001`,
      );
      expect(row.attendance_id).toBeNull();
    });

    it('a soft-deleted report does not block a new one; PUT creates a fresh row', async () => {
      await http()
        .put(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .send({ attendance: att(), report })
        .expect(200);
      await ds.query(
        `UPDATE life_group_reports SET deleted_at = now() WHERE life_group_id=9001`,
      );
      const res = await http()
        .put(meetingUrl(9001, THIS_WEEK))
        .set(as(9101))
        .send({ attendance: att(), report })
        .expect(200);
      expect(res.body.report.deleted_at).toBeNull();
      expect(await count('life_group_reports', 'life_group_id=9001')).toBe(2);
      expect(
        await count(
          'life_group_reports',
          'life_group_id=9001 AND deleted_at IS NULL',
        ),
      ).toBe(1);
    });

    it('legacy POST of a duplicate (group,date) is a clean 409 when the index exists', async () => {
      const body = {
        ...report,
        date: THIS_WEEK,
        area_id: 9001,
        sector_id: 9001,
        life_group_id: 9001,
        committed_members: 3,
        committed_members_present: 2,
      };
      await http()
        .post('/forms/life-group-reports')
        .set(as(9109))
        .send(body)
        .expect(201);
      await http()
        .post('/forms/life-group-reports')
        .set(as(9109))
        .send(body)
        .expect(409);
    });

    it('dirty DB (index absent, duplicates present): PUT updates the oldest, leaves the rest', async () => {
      await ds.query(`DROP INDEX IF EXISTS ${INDEX}`);
      try {
        const insert = (n: number) =>
          ds.query(
            `INSERT INTO life_group_reports (date,area_id,sector_id,life_group_id,committed_members,committed_members_present,kids_0_to_11,guests,mdas,committed_at_tadel,committed_at_culto,disciples_count,disciples_discipled_this_week,pastoring_activity_type,training_activity_type,"submittedById",created_at)
             VALUES ($1,9001,9001,9001,9,9,$2::int,0,0,0,0,0,0,'{}','{}',9101, now() - make_interval(hours => $2::int)) RETURNING id`,
            [THIS_WEEK, n],
          );
        const [{ id: newer }] = await insert(1);
        const [{ id: older }] = await insert(5);
        const res = await http()
          .put(meetingUrl(9001, THIS_WEEK))
          .set(as(9101))
          .send({ attendance: att(), report })
          .expect(200);
        expect(res.body.report.id).toBe(older);
        const rows = await ds.query(
          `SELECT id, kids_0_to_11 FROM life_group_reports WHERE life_group_id=9001 ORDER BY id`,
        );
        expect(rows).toHaveLength(2);
        expect(
          rows.find((r: { id: string }) => r.id === newer).kids_0_to_11,
        ).toBe(1);
      } finally {
        await clean();
        await ensureIndex();
      }
    });
  });

  it('old endpoints keep their contracts (attendance GET/PUT shape, reports list)', async () => {
    const put = await http()
      .put(`/life-groups/9001/attendance/${THIS_WEEK}`)
      .set(as(9101))
      .send(att())
      .expect(200);
    expect(Object.keys(put.body).sort()).toEqual(
      [
        'created_at',
        'entries',
        'id',
        'life_group_id',
        'meeting_date',
        'members_count',
        'present_count',
        'recorded_by',
        'updated_at',
      ].sort(),
    );
    const draft = await http()
      .get(`/life-groups/9001/attendance/${wednesday(1)}`)
      .set(as(9101))
      .expect(200);
    expect(draft.body.is_draft).toBe(true);
    expect('default_present' in draft.body).toBe(false);
    const list = await http()
      .get('/forms/life-group-reports')
      .query({ life_group_id: '9001' })
      .set(as(9101))
      .expect(200);
    expect(list.body).toEqual([]);
  });

  describe('GET error-code contract (the TestFlight 404 report)', () => {
    it('leader, past date outside the edit window, NO record: 200 read-only draft of the current roster', async () => {
      const res = await http()
        .get(meetingUrl(9001, OLD))
        .set(as(9101))
        .expect(200);
      expect(res.body).toMatchObject({
        life_group_id: 9001,
        meeting_date: OLD,
        can_write: true,
        can_edit: false,
        report: null,
        attendance: { id: null, is_draft: true, members_count: 3 },
      });
      expect(res.body.edit_deadline < THIS_WEEK).toBe(true);
      expect(
        res.body.attendance.entries.map((e: { name: string }) => e.name),
      ).toEqual(['Ana', 'Bruno', 'Carla']);
      // The draft is never persisted.
      expect(await count('life_group_attendance', 'life_group_id=9001')).toBe(
        0,
      );
    });

    it('the same date for an admin is editable', async () => {
      const res = await http()
        .get(meetingUrl(9001, OLD))
        .set(as(9109))
        .expect(200);
      expect(res.body.can_edit).toBe(true);
    });

    it('past non-regular weekday: 400 extra_meeting_required', async () => {
      const [y, m, d] = OLD.split('-').map(Number);
      const tuesday = dateKeyOf(shiftDays({ year: y, month: m, day: d }, -1));
      const res = await http()
        .get(meetingUrl(9001, tuesday))
        .set(as(9101))
        .expect(400);
      expect(res.body.code).toBe('extra_meeting_required');
    });

    it('future date: 400 date_in_future', async () => {
      const [y, m, d] = THIS_WEEK.split('-').map(Number);
      const future = dateKeyOf(shiftDays({ year: y, month: m, day: d }, 14));
      const res = await http()
        .get(meetingUrl(9001, future))
        .set(as(9101))
        .expect(400);
      expect(res.body.code).toBe('date_in_future');
    });

    it('unknown group: 404 group_not_found', async () => {
      const res = await http()
        .get(meetingUrl(9999, OLD))
        .set(as(9109))
        .expect(404);
      expect(res.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        code: 'group_not_found',
      });
    });

    it('non-member: 403 life_group_access_forbidden (never a 404)', async () => {
      const res = await http()
        .get(meetingUrl(9001, OLD))
        .set(as(9111))
        .expect(403);
      expect(res.body.code).toBe('life_group_access_forbidden');
    });

    it('a route the build does not have: generic 404, NO code', async () => {
      const res = await http()
        .get(`/life-groups/9001/meetings-missing/${OLD}`)
        .set(as(9101))
        .expect(404);
      expect(res.body.code).toBeUndefined();
      expect(res.body.message).toMatch(/^Cannot GET /);
    });
  });
});
