import {
  ClassSerializerInterceptor,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../common/constants/global-validation-pipe-options';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { LifeGroupReportsController } from './life-group-reports.controller';
import { LifeGroupReportsService } from './life-group-reports.service';
import { LifeGroupReport } from './entities/life-group-report.entity';

// Phase 0 characterization (pre-fix behaviour, committed for the record and
// replaced in Phase 1). Boots a real Nest app with the exact global pipe and
// ClassSerializerInterceptor options main.ts installs, and proves:
//  1. the raw TypeORM entity serializes to `{}` (list + detail);
//  2. the audit trail is collapsed the same way;
//  3. GET :id / :id/audit resolve any report for a caller whose scope is
//     empty (a plain member), i.e. there is no object-level authorization.
describe('LifeGroupReports (Phase 0 characterization of unfixed behaviour)', () => {
  let app: INestApplication;
  const entity = Object.assign(new LifeGroupReport(), {
    id: 'r-1',
    date: '2026-10-01',
    lifeGroupId: 99,
    committedMembersPresent: 5,
    offering: '10.00',
    submittedBy: { id: 1, name: 'Someone Else' },
  });
  const repo = {
    findOne: jest.fn().mockResolvedValue(entity),
    createQueryBuilder: jest.fn(),
  };
  const audit = {
    record: jest.fn(),
    listForSubmission: jest.fn().mockResolvedValue([{ id: 'a1' }]),
  };

  beforeAll(async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([entity]),
    };
    repo.createQueryBuilder.mockReturnValue(qb);
    const moduleRef = await Test.createTestingModule({
      controllers: [LifeGroupReportsController],
      providers: [
        LifeGroupReportsService,
        { provide: getRepositoryToken(LifeGroupReport), useValue: repo },
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
          ctx.switchToHttp().getRequest<RequestWithScope>().formScope = {
            unrestricted: false,
            areaIds: [],
            sectorIds: [],
            lifeGroupIds: [],
          };
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

  afterAll(async () => {
    await app.close();
  });

  it('serializes list items to {} (entity has no @Expose, no SerializeOptions)', async () => {
    const res = await request(app.getHttpServer())
      .get('/forms/life-group-reports')
      .expect(200);
    expect(res.body).toEqual([{}]);
  });

  it('serializes the detail to {} yet returns it to an out-of-scope member', async () => {
    const res = await request(app.getHttpServer())
      .get('/forms/life-group-reports/r-1')
      .expect(200);
    expect(res.body).toEqual({});
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r-1' } }),
    );
  });

  it('returns the audit trail to an out-of-scope member (no scope check)', async () => {
    const res = await request(app.getHttpServer())
      .get('/forms/life-group-reports/r-1/audit')
      .expect(200);
    // Also collapsed to [{}] by the global serializer for the same reason.
    expect(res.body).toEqual([{}]);
    expect(audit.listForSubmission).toHaveBeenCalledWith(
      'life-group-reports',
      'r-1',
    );
  });
});
