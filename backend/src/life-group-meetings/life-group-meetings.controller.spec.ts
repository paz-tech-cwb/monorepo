/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- supertest bodies are untyped */
import {
  ClassSerializerInterceptor,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import request from 'supertest';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../common/constants/global-validation-pipe-options';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { LifeGroupAttendanceService } from '../life-group-attendance/life-group-attendance.service';
import { LifeGroupAttendance } from '../life-group-attendance/entities/life-group-attendance.entity';
import { LifeGroupAttendanceEntry } from '../life-group-attendance/entities/life-group-attendance-entry.entity';
import { LifeGroupReport } from '../life-group-reports/entities/life-group-report.entity';
import { LifeGroupReportSnapshotService } from '../life-group-reports/life-group-report-snapshot.service';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { User } from '../users/entities/user.entity';
import { FakeEntityManager } from './fake-entity-manager.testing';
import { LifeGroupMeetingsController } from './life-group-meetings.controller';
import { LifeGroupMeetingsService } from './life-group-meetings.service';

// Real Nest app with the exact global ValidationPipe and
// ClassSerializerInterceptor options main.ts installs, real controller,
// service and attendance/snapshot services, over an in-memory EntityManager.
describe('LifeGroupMeetingsController (global pipe + serializer)', () => {
  let app: INestApplication;
  let em: FakeEntityManager;
  let scope: ResolvedScope;
  let role: string;
  let userId: number;
  const TODAY = '2026-10-14'; // Wednesday

  const validReport = {
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
    pastoring_activity_other: 'x',
    training_activity_type: [],
  };
  const validAttendance = {
    entries: [
      { user_id: 103, present: true },
      { user_id: 104, present: false },
    ],
  };

  beforeAll(async () => {
    jest.useFakeTimers({
      now: new Date('2026-10-14T15:00:00Z'),
      doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval'],
    });
    em = new FakeEntityManager();
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      controllers: [LifeGroupMeetingsController],
      providers: [
        LifeGroupMeetingsService,
        LifeGroupAttendanceService,
        LifeGroupReportSnapshotService,
        { provide: getEntityManagerToken(), useValue: em },
        { provide: FormSubmissionAuditService, useValue: audit },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest<{ user: unknown }>().user = {
            id: userId,
            role: { slug: role },
          };
          return true;
        },
      })
      .overrideGuard(ScopeGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest<RequestWithScope>().formScope = scope;
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
  });

  beforeEach(() => {
    scope = {
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [],
    };
    role = 'member';
    userId = 101;
    em.tables.clear();
    em.queries = [];
    const users = [103, 104].map((id) =>
      Object.assign(new User(), { id, name: `u${id}` }),
    );
    em.seed(User, ...users);
    em.rows(LifeGroupAttendance);
    em.rows(LifeGroupAttendanceEntry);
    em.rows(LifeGroupReport);
    em.seed(
      LifeGroup,
      Object.assign(new LifeGroup(), {
        id: 1,
        leader: { id: 101 },
        coLeader: null,
        users,
        sector: { id: 1, area: { id: 1 } },
        meetingDay: 'Quarta-feira',
      }),
    );
  });

  afterAll(async () => {
    jest.useRealTimers();
    await app.close();
  });

  const url = `/life-groups/1/meetings/${TODAY}`;

  it('GET serializes the draft as snake_case (not {})', async () => {
    const res = await request(app.getHttpServer()).get(url).expect(200);
    expect(res.body).toMatchObject({
      life_group_id: 1,
      meeting_date: TODAY,
      report: null,
      derived: { committed_members: 2, committed_members_present: 2 },
      can_write: true,
      can_edit: true,
      edit_deadline: '2026-10-28',
      report_blocked_reason: null,
      attendance: { is_draft: true, default_present: true, id: null },
    });
  });

  it('PUT creates attendance + report and returns the combined view', async () => {
    const res = await request(app.getHttpServer())
      .put(url)
      .send({ attendance: validAttendance, report: validReport })
      .expect(200);
    expect(res.body.attendance).toMatchObject({
      is_draft: false,
      members_count: 2,
      present_count: 1,
    });
    expect(res.body.report).toMatchObject({
      offering: '12.50',
      committed_members: 2,
      committed_members_present: 1,
      area_id: 1,
      sector_id: 1,
      pastoring_activity_other: 'x',
      training_activity_other: null,
    });
    // Response never leaks entity internals.
    expect(JSON.stringify(res.body)).not.toMatch(/email|phoneNumber|password/);
  });

  it('IGNORES client-sent derived fields (date, area_id, sector_id, life_group_id, committed_*)', async () => {
    const res = await request(app.getHttpServer())
      .put(url)
      .send({
        attendance: validAttendance,
        report: {
          ...validReport,
          date: '1999-01-01',
          area_id: 77,
          sector_id: 88,
          life_group_id: 99,
          committed_members: 500,
          committed_members_present: 400,
          attendance_id: 'x',
          id: 'forged',
        },
      })
      .expect(200);
    expect(res.body.report).toMatchObject({
      date: TODAY,
      area_id: 1,
      sector_id: 1,
      life_group_id: 1,
      committed_members: 2,
      committed_members_present: 1,
    });
    expect(res.body.report.id).not.toBe('forged');
  });

  it('answers 409 attendance_required for a report with no attendance', async () => {
    const res = await request(app.getHttpServer())
      .put(url)
      .send({ report: validReport })
      .expect(409);
    expect(res.body.code).toBe('attendance_required');
  });

  it('answers 403 outside the edit window for a non-admin, 200 for admin', async () => {
    const old = '/life-groups/1/meetings/2026-09-23';
    const res = await request(app.getHttpServer())
      .put(old)
      .send({ attendance: validAttendance })
      .expect(403);
    expect(res.body.code).toBe('edit_window_closed');
    role = 'admin';
    await request(app.getHttpServer())
      .put(old)
      .send({ attendance: validAttendance })
      .expect(200);
    role = 'member';
    await request(app.getHttpServer()).get(old).expect(200); // reads allowed
  });

  describe('extra_meeting flag', () => {
    const TUE = '2026-10-13';
    const tueUrl = `/life-groups/1/meetings/${TUE}`;

    it('PUT without the flag on a non-fixed weekday: 400 mentioning extra_meeting', async () => {
      const res = await request(app.getHttpServer())
        .put(tueUrl)
        .send({ attendance: validAttendance })
        .expect(400);
      expect(res.body.code).toBe('extra_meeting_required');
      expect(res.body.message).toContain('extra_meeting');
      expect(em.rows(LifeGroupAttendance)).toHaveLength(0);
    });

    it('PUT with extra_meeting: true stores and returns is_extra; GET shows it', async () => {
      const res = await request(app.getHttpServer())
        .put(tueUrl)
        .send({ attendance: validAttendance, extra_meeting: true })
        .expect(200);
      expect(res.body.attendance).toMatchObject({
        is_extra: true,
        is_draft: false,
        members_count: 2,
      });
      const get = await request(app.getHttpServer()).get(tueUrl).expect(200);
      expect(get.body.attendance).toMatchObject({ is_extra: true });
    });

    it('PUT: regular day returns is_extra=false; the flag there is a 400', async () => {
      const ok = await request(app.getHttpServer())
        .put(url)
        .send({ attendance: validAttendance })
        .expect(200);
      expect(ok.body.attendance.is_extra).toBe(false);
      const bad = await request(app.getHttpServer())
        .put(url)
        .send({ attendance: validAttendance, extra_meeting: true })
        .expect(400);
      expect(bad.body.code).toBe('extra_meeting_immutable');
    });

    it.each(['yes', 1, 'true', {}, []])(
      'rejects a non-boolean extra_meeting (%j)',
      async (value) => {
        await request(app.getHttpServer())
          .put(tueUrl)
          .send({ attendance: validAttendance, extra_meeting: value })
          .expect(400);
        expect(em.rows(LifeGroupAttendance)).toHaveLength(0);
      },
    );

    it('GET ?extra_meeting=true previews an extra draft; without it 400', async () => {
      await request(app.getHttpServer()).get(tueUrl).expect(400);
      const res = await request(app.getHttpServer())
        .get(`${tueUrl}?extra_meeting=true`)
        .expect(200);
      expect(res.body.attendance).toMatchObject({
        is_draft: true,
        is_extra: true,
        default_present: true,
      });
      // 'false' is valid and means "not requested" (still 400 on this day).
      await request(app.getHttpServer())
        .get(`${tueUrl}?extra_meeting=false`)
        .expect(400);
    });

    it.each(['TRUE', 'False', '1', 'yes', 'abc', ''])(
      'GET rejects extra_meeting=%j with a 400 naming the param',
      async (value) => {
        const res = await request(app.getHttpServer())
          .get(`${tueUrl}?extra_meeting=${value}`)
          .expect(400);
        expect(res.body.message).toContain("extra_meeting must be 'true'");
      },
    );

    it('GET rejects a repeated extra_meeting param', async () => {
      await request(app.getHttpServer())
        .get(`${tueUrl}?extra_meeting=true&extra_meeting=true`)
        .expect(400);
    });
  });

  // Error-code contract for GET /life-groups/:id/meetings/:date. Clients
  // branch on `code`; a 404 WITHOUT a code is Nest's generic route-not-found
  // (the running build does not have the route, e.g. a failed deploy).
  describe('GET error-code contract', () => {
    const OLD_WED = '2026-09-09'; // 5 weeks ago, a Wednesday (group meets Wed)
    const OLD_TUE = '2026-09-08';

    it('past date outside the edit window with NO record: 200 read-only draft (never 404)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/life-groups/1/meetings/${OLD_WED}`)
        .expect(200);
      expect(res.body).toMatchObject({
        meeting_date: OLD_WED,
        can_write: true,
        can_edit: false,
        edit_deadline: '2026-09-23',
        attendance: { is_draft: true, id: null, members_count: 2 },
        report: null,
      });
      expect(res.body.edit_deadline < TODAY).toBe(true);
    });

    it('the same past date for an admin stays editable', async () => {
      role = 'admin';
      userId = 999;
      scope = { ...scope, unrestricted: true };
      const res = await request(app.getHttpServer())
        .get(`/life-groups/1/meetings/${OLD_WED}`)
        .expect(200);
      expect(res.body).toMatchObject({ can_edit: true, can_write: true });
    });

    it('past non-regular weekday without the flag: 400 extra_meeting_required', async () => {
      const res = await request(app.getHttpServer())
        .get(`/life-groups/1/meetings/${OLD_TUE}`)
        .expect(400);
      expect(res.body.code).toBe('extra_meeting_required');
    });

    it('unknown group: 404 group_not_found', async () => {
      const res = await request(app.getHttpServer())
        .get(`/life-groups/2/meetings/${OLD_WED}`)
        .expect(404);
      expect(res.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        code: 'group_not_found',
      });
    });

    it('no access: 403 life_group_access_forbidden', async () => {
      em.rows(LifeGroup)[0].leader = { id: 555 };
      const res = await request(app.getHttpServer()).get(url).expect(403);
      expect(res.body.code).toBe('life_group_access_forbidden');
    });

    it.each([
      ['2026-10-21', 'date_in_future'],
      ['2026-13-40', 'invalid_meeting_date'],
      ['not-a-date', 'invalid_meeting_date_format'],
    ])('date %s: 400 %s', async (date, code) => {
      const res = await request(app.getHttpServer())
        .get(`/life-groups/1/meetings/${date}`)
        .expect(400);
      expect(res.body.code).toBe(code);
    });

    it('bad extra_meeting param: 400 invalid_extra_meeting_param', async () => {
      const res = await request(app.getHttpServer())
        .get(`${url}?extra_meeting=yes`)
        .expect(400);
      expect(res.body.code).toBe('invalid_extra_meeting_param');
    });

    it('a legacy report on a NON-regular weekday opens 200 without the flag (attendance null, report populated)', async () => {
      em.seed(
        LifeGroupReport,
        Object.assign(new LifeGroupReport(), {
          id: 'legacy',
          date: OLD_TUE,
          lifeGroupId: 1,
          deletedAt: null,
          createdAt: new Date(1),
          submittedBy: { id: 1, name: 'x' },
        }),
      );
      const res = await request(app.getHttpServer())
        .get(`/life-groups/1/meetings/${OLD_TUE}`)
        .expect(200);
      expect(res.body.attendance).toBeNull();
      expect(res.body.report).toMatchObject({ id: 'legacy', date: OLD_TUE });
      expect(res.body.derived).toEqual({
        committed_members: null,
        committed_members_present: null,
      });
      expect(res.body.can_edit).toBe(false);
    });

    it('a saved EXTRA attendance opens 200 without the flag', async () => {
      const tue = '2026-10-13';
      await request(app.getHttpServer())
        .put(`/life-groups/1/meetings/${tue}`)
        .send({ attendance: validAttendance, extra_meeting: true })
        .expect(200);
      const res = await request(app.getHttpServer())
        .get(`/life-groups/1/meetings/${tue}`)
        .expect(200);
      expect(res.body.attendance).toMatchObject({
        is_extra: true,
        is_draft: false,
      });
    });

    it('a route the build does not have answers a generic 404 with NO code', async () => {
      const res = await request(app.getHttpServer())
        .get('/life-groups/1/not-deployed/2026-09-08')
        .expect(404);
      expect(res.body.code).toBeUndefined();
      expect(res.body.message).toMatch(/^Cannot GET /);
    });
  });

  it('answers 400 for an empty body', async () => {
    await request(app.getHttpServer()).put(url).send({}).expect(400);
  });

  describe('validation (400)', () => {
    const bad: Array<[string, Record<string, unknown>]> = [
      ['negative count', { kids_0_to_11: -1 }],
      ['fractional count', { guests: 1.5 }],
      ['count above cap', { mdas: 100001 }],
      ['string count', { disciples_count: '3' }],
      ['offering with sign', { offering: '-1' }],
      ['offering with 3 decimals', { offering: '1.234' }],
      ['offering too large', { offering: '123456789' }],
      ['offering with comma', { offering: '1,5' }],
      ['offering not a string', { offering: 12.5 }],
      ['array too long', { leader_attended: Array(21).fill('a') }],
      ['array item too long', { pastoring_activity_type: ['a'.repeat(81)] }],
      ['array item not string', { training_activity_type: [1] }],
      ['array not array', { leader_attended: 'tadel' }],
      ['other too long', { pastoring_activity_other: 'a'.repeat(181) }],
      ['missing field', { guests: undefined }],
    ];
    it.each(bad)('rejects %s', async (_name, patch) => {
      await request(app.getHttpServer())
        .put(url)
        .send({
          attendance: validAttendance,
          report: { ...validReport, ...patch },
        })
        .expect(400);
      expect(em.rows(LifeGroupAttendance)).toHaveLength(0);
    });

    it('accepts boundaries', async () => {
      await request(app.getHttpServer())
        .put(url)
        .send({
          attendance: validAttendance,
          report: {
            ...validReport,
            kids_0_to_11: 0,
            mdas: 100000,
            offering: '99999999.99',
            leader_attended: Array(20).fill('a'.repeat(80)),
            pastoring_activity_other: 'a'.repeat(180),
          },
        })
        .expect(200);
    });

    it('rejects bad attendance bodies', async () => {
      for (const attendance of [
        { entries: [] },
        { entries: [{ user_id: 'x', present: true }] },
        { entries: [{ user_id: 103, present: 'yes' }] },
        { entries: Array(501).fill({ user_id: 103, present: true }) },
        {},
      ]) {
        await request(app.getHttpServer())
          .put(url)
          .send({ attendance })
          .expect(400);
      }
    });

    it('rejects non-object attendance/report values (arrays, strings, numbers)', async () => {
      for (const bad of [[], [1], 'x', 5, true]) {
        await request(app.getHttpServer())
          .put(url)
          .send({ attendance: bad })
          .expect(400);
        await request(app.getHttpServer())
          .put(url)
          .send({ attendance: validAttendance, report: bad })
          .expect(400);
      }
      expect(em.rows(LifeGroupAttendance)).toHaveLength(0);
    });

    it('rejects a non-numeric group id', async () => {
      await request(app.getHttpServer())
        .get(`/life-groups/abc/meetings/${TODAY}`)
        .expect(400);
    });

    it('rejects a malformed date', async () => {
      await request(app.getHttpServer())
        .get('/life-groups/1/meetings/not-a-date')
        .expect(400);
    });
  });

  it('answers 403 for a user without access', async () => {
    // Request user id is 101 = group leader; swap the group's leader.
    em.rows(LifeGroup)[0].leader = { id: 555 };
    await request(app.getHttpServer()).get(url).expect(403);
    await request(app.getHttpServer())
      .put(url)
      .send({ attendance: validAttendance })
      .expect(403);
  });

  describe('write authorization (supervisors are read-only)', () => {
    const SUPERVISOR = 900;
    const extraUrl = '/life-groups/1/meetings/2026-10-13'; // Tuesday = extra

    function asSupervisor(): void {
      userId = SUPERVISOR;
      role = 'sector_leader';
      scope = { ...scope, lifeGroupIds: [1], sectorIds: [1] };
    }

    it('supervisor in scope: GET 200 read-only, PUT 403 meeting_write_forbidden (attendance, report, extra meeting)', async () => {
      asSupervisor();
      const got = await request(app.getHttpServer()).get(url).expect(200);
      expect(got.body).toMatchObject({
        can_write: false,
        can_edit: false,
        edit_deadline: '2026-10-28',
      });
      for (const body of [
        { attendance: validAttendance },
        { report: validReport },
        { attendance: validAttendance, report: validReport },
      ]) {
        const res = await request(app.getHttpServer())
          .put(url)
          .send(body)
          .expect(403);
        expect(res.body.code).toBe('meeting_write_forbidden');
      }
      const extra = await request(app.getHttpServer())
        .put(extraUrl)
        .send({ attendance: validAttendance, extra_meeting: true })
        .expect(403);
      expect(extra.body.code).toBe('meeting_write_forbidden');
      expect(em.rows(LifeGroupAttendance)).toHaveLength(0);
      expect(em.rows(LifeGroupReport)).toHaveLength(0);
    });

    it('co-leader with the member role may write', async () => {
      em.rows(LifeGroup)[0].coLeader = { id: 777 };
      userId = 777;
      role = 'member';
      const got = await request(app.getHttpServer()).get(url).expect(200);
      expect(got.body.can_write).toBe(true);
      await request(app.getHttpServer())
        .put(url)
        .send({ attendance: validAttendance })
        .expect(200);
    });

    it('admin and pastor outside the group may write; pastor stays bound by the edit window', async () => {
      const old = '/life-groups/1/meetings/2026-09-23';
      scope = { ...scope, unrestricted: true };
      userId = SUPERVISOR;
      role = 'pastor';
      const got = await request(app.getHttpServer()).get(url).expect(200);
      expect(got.body).toMatchObject({ can_write: true, can_edit: true });
      await request(app.getHttpServer())
        .put(url)
        .send({ attendance: validAttendance })
        .expect(200);
      const closed = await request(app.getHttpServer())
        .put(old)
        .send({ attendance: validAttendance })
        .expect(403);
      expect(closed.body.code).toBe('edit_window_closed');
      role = 'admin';
      await request(app.getHttpServer())
        .put(old)
        .send({ attendance: validAttendance })
        .expect(200);
    });

    it("another group's leader is denied (403 on GET and PUT)", async () => {
      userId = 555;
      role = 'life_group_leader';
      await request(app.getHttpServer()).get(url).expect(403);
      await request(app.getHttpServer())
        .put(url)
        .send({ attendance: validAttendance })
        .expect(403);
    });
  });
});
