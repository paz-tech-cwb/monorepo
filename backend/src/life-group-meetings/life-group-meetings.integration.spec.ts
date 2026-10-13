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
import { LifeGroupMeetingsModule } from './life-group-meetings.module';
import {
  zonedParts,
  dateKeyOf,
  shiftDays,
} from '../life-group-attendance/meeting-day.util';

/**
 * OPT-IN integration spec against a REAL PostgreSQL that already has every
 * migration applied (including 1796000000000). Skipped unless
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
    it.each([
      ['leader (role member)', 9101, 9001, true],
      ['co-leader (role member)', 9102, 9001, true],
      ['leader of two groups (second)', 9101, 9004, true],
      ['area supervisor in scope', 9106, 9001, true],
      ['sector supervisor in scope', 9107, 9001, true],
      ['supervisor of ANOTHER area', 9112, 9001, false],
      ['plain roster member', 9103, 9001, false],
      ['outsider', 9111, 9001, false],
      ["other group's leader", 9108, 9001, false],
      ['admin', 9109, 9001, true],
      ['pastor', 9110, 9001, true],
    ])('%s', async (_n, user, group, allowed) => {
      const get = await http().get(meetingUrl(group, THIS_WEEK)).set(as(user));
      expect(get.status).toBe(allowed ? 200 : 403);
      const put = await http()
        .put(meetingUrl(group, THIS_WEEK))
        .set(as(user))
        .send({
          attendance:
            group === 9001
              ? att()
              : { entries: [{ user_id: 9103, present: true }] },
        });
      expect(put.status).toBe(allowed ? 200 : 403);
      expect(
        await count('life_group_attendance', `life_group_id=${group}`),
      ).toBe(allowed ? 1 : 0);
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
});
