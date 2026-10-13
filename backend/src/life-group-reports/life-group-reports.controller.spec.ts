import {
  ClassSerializerInterceptor,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../common/constants/global-validation-pipe-options';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { LifeGroupReportCreatePolicy } from './life-group-report-create-policy';
import { LifeGroupReportsController } from './life-group-reports.controller';
import { LifeGroupReportsService } from './life-group-reports.service';
import { LifeGroupReport } from './entities/life-group-report.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';

// Boots a real Nest app with the exact global ValidationPipe and
// ClassSerializerInterceptor options main.ts installs (the pre-fix controller
// serialized every report to `{}` under them; see git history of this spec),
// with the real service over a mocked repository/EntityManager.
describe('LifeGroupReportsController (global pipe + serializer)', () => {
  let app: INestApplication;
  let scope: ResolvedScope;
  let ledIds: number[];
  let user: { id: number; role: { slug: string } };
  let foundGroup: unknown;

  const group = (over: Record<string, unknown> = {}) => ({
    id: 10,
    leader: { id: 1 },
    coLeader: { id: 555 },
    sector: { id: 2, area: { id: 1 } },
    ...over,
  });

  const validBody = (over: Record<string, unknown> = {}) => ({
    date: '2020-01-05',
    life_group_id: 10,
    committed_members: 8,
    committed_members_present: 6,
    kids_0_to_11: 2,
    guests: 1,
    mdas: 0,
    offering: '12.50',
    committed_at_tadel: 3,
    committed_at_culto: 4,
    leader_attended: ['tadel'],
    disciples_count: 2,
    disciples_discipled_this_week: 1,
    pastoring_activity_type: ['visita'],
    training_activity_type: [],
    ...over,
  });

  const entity = Object.assign(new LifeGroupReport(), {
    id: 'r-1',
    date: '2026-10-01',
    areaId: 1,
    sectorId: 2,
    lifeGroupId: 10,
    committedMembers: 8,
    committedMembersPresent: 6,
    offering: '12.50',
    leaderAttended: [],
    pastoringActivityType: [],
    trainingActivityType: [],
    submittedBy: { id: 1, name: 'Someone Else' },
  });
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([entity]),
  };
  const repo = {
    findOne: jest.fn().mockResolvedValue(entity),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    create: jest.fn((v: unknown) => v),
    save: jest.fn((v: Record<string, unknown>) =>
      Promise.resolve({ ...v, id: 'r-1' }),
    ),
    // Used by the real update path in the PATCH tests.
  };
  const lgQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  const em = {
    createQueryBuilder: jest.fn().mockReturnValue(lgQb),
    findOne: jest.fn(() => Promise.resolve(foundGroup)),
  };
  const policyService = {
    assertCanEdit: jest.fn(),
    assertCanDelete: jest.fn(),
  };
  const audit = {
    record: jest.fn(),
    listForSubmission: jest.fn().mockResolvedValue([
      {
        id: 'a1',
        formSlug: 'life-group-reports',
        submissionId: 'r-1',
        action: 'create',
        diff: null,
        createdAt: new Date('2026-10-02T10:00:00Z'),
        actor: {
          id: 7,
          name: 'Leader',
          email: 'leader@example.com',
          phoneNumber: '+5511999999999',
        },
      },
    ]),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LifeGroupReportsController],
      providers: [
        LifeGroupReportsService,
        { provide: getRepositoryToken(LifeGroupReport), useValue: repo },
        { provide: getEntityManagerToken(), useValue: em },
        LifeGroupReportCreatePolicy,
        { provide: FormSubmissionPolicyService, useValue: policyService },
        { provide: FormSubmissionAuditService, useValue: audit },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest<{ user: unknown }>().user = user;
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
    ledIds = [];
    user = { id: 555, role: { slug: 'member' } };
    foundGroup = group();
    repo.save.mockClear();
    repo.create.mockClear();
    audit.record.mockClear();
    lgQb.getRawMany.mockImplementation(() =>
      Promise.resolve(ledIds.map((id) => ({ id: String(id) }))),
    );
    qb.andWhere.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serializes the list as snake_case (not {}) for a co-leader via fallback', async () => {
    ledIds = [10];
    const res = await request(app.getHttpServer())
      .get('/forms/life-group-reports')
      .expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual(
      expect.objectContaining({
        id: 'r-1',
        life_group_id: 10,
        committed_members_present: 6,
        offering: '12.50',
        submitted_by: { id: 1, name: 'Someone Else' },
      }),
    );
  });

  it('passes ?life_group_id as a number through the DTO to the query', async () => {
    ledIds = [10];
    await request(app.getHttpServer())
      .get('/forms/life-group-reports')
      .query({ life_group_id: '10' })
      .expect(200);
    expect(qb.andWhere).toHaveBeenCalledWith('f.life_group_id = ANY(:lgs)', {
      lgs: [10],
    });
  });

  it('answers 403 for a life_group_id filter outside the actor scope', async () => {
    ledIds = [10];
    await request(app.getHttpServer())
      .get('/forms/life-group-reports')
      .query({ life_group_id: '99' })
      .expect(403);
  });

  it('rejects a non-numeric life_group_id with 400', async () => {
    await request(app.getHttpServer())
      .get('/forms/life-group-reports')
      .query({ life_group_id: 'abc' })
      .expect(400);
  });

  it('serializes the detail as snake_case for an in-scope actor', async () => {
    scope.lifeGroupIds = [10];
    const res = await request(app.getHttpServer())
      .get('/forms/life-group-reports/r-1')
      .expect(200);
    const body = res.body as Record<string, unknown>;
    expect(body.life_group_id).toBe(10);
    expect(body.submitted_by).toEqual({ id: 1, name: 'Someone Else' });
  });

  it('answers 404 on detail and audit for an out-of-scope member', async () => {
    await request(app.getHttpServer())
      .get('/forms/life-group-reports/r-1')
      .expect(404);
    audit.listForSubmission.mockClear();
    await request(app.getHttpServer())
      .get('/forms/life-group-reports/r-1/audit')
      .expect(404);
    expect(audit.listForSubmission).not.toHaveBeenCalled();
  });

  it('returns the audit trail intact (not collapsed) for an in-scope actor', async () => {
    scope.lifeGroupIds = [10];
    const res = await request(app.getHttpServer())
      .get('/forms/life-group-reports/r-1/audit')
      .expect(200);
    expect(res.body).toEqual([
      {
        id: 'a1',
        form_slug: 'life-group-reports',
        submission_id: 'r-1',
        action: 'create',
        diff: null,
        created_at: '2026-10-02T10:00:00.000Z',
        actor: { id: 7, name: 'Leader' },
      },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/email|phoneNumber/);
  });

  describe('POST (scope-based create)', () => {
    const post = (body: Record<string, unknown>) =>
      request(app.getHttpServer()).post('/forms/life-group-reports').send(body);
    const created = () =>
      repo.create.mock.calls[0][0] as Record<string, unknown>;

    it('lets a member-role co-leader create (leader/co-leader fallback, empty scope), deriving area/sector', async () => {
      const res = await post(validBody()).expect(201);
      expect(res.body).toEqual(
        expect.objectContaining({ id: 'r-1', life_group_id: 10 }),
      );
      expect(created()).toEqual(
        expect.objectContaining({
          lifeGroupId: 10,
          areaId: 1,
          sectorId: 2,
          submittedBy: { id: 555 },
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create', actorId: 555 }),
      );
    });

    it('lets a member-role leader (leader_id) create', async () => {
      foundGroup = group({ leader: { id: 555 }, coLeader: null });
      await post(validBody()).expect(201);
    });

    it('lets a leader of two groups create for each of them', async () => {
      scope.lifeGroupIds = [10, 11];
      foundGroup = group({ id: 11, leader: { id: 555 }, coLeader: null });
      await post(validBody({ life_group_id: 11 })).expect(201);
      foundGroup = group({ id: 10, leader: { id: 555 }, coLeader: null });
      await post(validBody({ life_group_id: 10 })).expect(201);
    });

    it('lets a supervisor create for an in-scope group and 403s outside it', async () => {
      user = { id: 600, role: { slug: 'area_leader' } };
      foundGroup = group({ leader: { id: 1 }, coLeader: null });
      scope.lifeGroupIds = [10];
      await post(validBody()).expect(201);
      scope.lifeGroupIds = [11];
      await post(validBody()).expect(403);
    });

    it('lets admin/pastor create for any group', async () => {
      user = { id: 1000, role: { slug: 'admin' } };
      scope.unrestricted = true;
      foundGroup = group({ leader: { id: 1 }, coLeader: null });
      await post(validBody()).expect(201);
    });

    it("403s a plain member and another group's leader", async () => {
      foundGroup = group({ leader: { id: 1 }, coLeader: { id: 2 } });
      await post(validBody()).expect(403);
      scope.lifeGroupIds = [11]; // leads a different group
      await post(validBody()).expect(403);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('404s an unknown life group', async () => {
      foundGroup = null;
      await post(validBody({ life_group_id: 9999 })).expect(404);
    });

    it('422s a group without sector or area', async () => {
      foundGroup = group({ sector: null });
      await post(validBody()).expect(422);
      foundGroup = group({ sector: { id: 2, area: null } });
      await post(validBody()).expect(422);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('ignores client-sent area_id/sector_id (old clients keep working, no 400)', async () => {
      await post(validBody({ area_id: 77, sector_id: 88 })).expect(201);
      expect(created()).toEqual(
        expect.objectContaining({ areaId: 1, sectorId: 2 }),
      );
    });

    it('rejects a future date with 400', async () => {
      await post(validBody({ date: '2999-01-01' })).expect(400);
    });

    it.each([
      ['negative count', { guests: -1 }],
      ['count above the ceiling', { mdas: 100001 }],
      ['non-integer count', { kids_0_to_11: 1.5 }],
      ['negative offering', { offering: '-5' }],
      ['offering with 3 decimals', { offering: '1.234' }],
      ['offering over 8 integer digits', { offering: '123456789' }],
      ['offering with comma', { offering: '1,50' }],
      ['more than 20 array items', { leader_attended: Array(21).fill('x') }],
      [
        'array item over 80 chars',
        { pastoring_activity_type: ['x'.repeat(81)] },
      ],
      [
        'pastoring_activity_other over 180',
        { pastoring_activity_other: 'x'.repeat(181) },
      ],
      [
        'training_activity_other over 180',
        { training_activity_other: 'x'.repeat(181) },
      ],
      [
        'array sent as a string (old admin-ui)',
        { pastoring_activity_type: 'visita' },
      ],
    ])('rejects %s with 400', async (_name, patch) => {
      await post(validBody(patch)).expect(400);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('accepts boundary values', async () => {
      await post(
        validBody({
          guests: 0,
          mdas: 100000,
          offering: '12345678.99',
          leader_attended: Array(20).fill('x'.repeat(80)),
          pastoring_activity_other: 'x'.repeat(180),
          training_activity_other: 'y',
        }),
      ).expect(201);
      expect(created()).toEqual(
        expect.objectContaining({
          offering: '12345678.99',
          pastoringActivityOther: 'x'.repeat(180),
        }),
      );
    });

    it('still requires the original required fields', async () => {
      const body = validBody() as Record<string, unknown>;
      delete body.offering;
      await post(body).expect(400);
    });
  });

  describe('PATCH (update)', () => {
    it('drops life_group_id/area_id/sector_id so a report cannot be moved to another group', async () => {
      user = { id: 7, role: { slug: 'life_group_leader' } };
      const target = Object.assign(new LifeGroupReport(), entity);
      repo.findOne.mockResolvedValueOnce(target);
      repo.save.mockImplementationOnce((v: unknown) => Promise.resolve(v));
      const res = await request(app.getHttpServer())
        .patch('/forms/life-group-reports/r-1')
        .send({ guests: 5, life_group_id: 99, area_id: 98, sector_id: 97 })
        .expect(200);
      const body = res.body as Record<string, unknown>;
      expect(body.guests).toBe(5);
      expect(body.life_group_id).toBe(10);
      expect(body.area_id).toBe(1);
      expect(body.sector_id).toBe(2);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update', diff: { guests: 5 } }),
      );
    });

    it('rejects moving the date into the future with 400 (same rule as create)', async () => {
      await request(app.getHttpServer())
        .patch('/forms/life-group-reports/r-1')
        .send({ date: '2999-01-01' })
        .expect(400);
    });

    it('applies the new validation limits to updates', async () => {
      await request(app.getHttpServer())
        .patch('/forms/life-group-reports/r-1')
        .send({ guests: -1 })
        .expect(400);
    });
  });
});
