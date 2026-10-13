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
            id: 101,
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
});
