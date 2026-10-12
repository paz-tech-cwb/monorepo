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
  };
  const lgQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  const em = { createQueryBuilder: jest.fn().mockReturnValue(lgQb) };
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
        { provide: FormSubmissionPolicyService, useValue: {} },
        { provide: FormSubmissionAuditService, useValue: audit },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest<{ user: unknown }>().user = {
            id: 555,
            role: { slug: 'member' },
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
    ledIds = [];
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
});
