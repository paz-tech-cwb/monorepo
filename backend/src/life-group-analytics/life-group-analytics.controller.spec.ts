import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { LifeGroupAnalyticsController } from './life-group-analytics.controller';
import { LifeGroupAnalyticsService } from './life-group-analytics.service';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../common/constants/global-validation-pipe-options';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';

interface RequestWithUser extends Request {
  user: { id: number };
}

// Regression test for the global ValidationPipe (configured in main.ts with
// `transformOptions: { excludeExtraneousValues: true }`) silently stripping
// `life_group_id` from DistributionQueryDto when it isn't `@Expose()`d. This
// spins up a real Nest app with that exact pipe config applied, so it
// exercises the actual pipe + controller layer instead of calling the
// service directly (which would never have caught the bug).
describe('LifeGroupAnalyticsController (ValidationPipe regression)', () => {
  let app: INestApplication;
  const distribution = jest.fn().mockResolvedValue({
    by_day: [],
    by_hour: [],
    by_neighborhood: [],
    by_city: [],
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LifeGroupAnalyticsController],
      providers: [
        {
          provide: LifeGroupAnalyticsService,
          useValue: {
            distribution,
            attendance: jest.fn(),
            overview: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<RequestWithUser>();
          req.user = { id: 42 };
          return true;
        },
      })
      .overrideGuard(ScopeGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<RequestWithScope>();
          req.formScope = {
            unrestricted: false,
            areaIds: [],
            sectorIds: [],
            lifeGroupIds: [7],
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    // Imports the exact same config object main.ts uses, so the two can
    // never drift apart.
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('passes life_group_id through the global ValidationPipe to the service', async () => {
    await request(app.getHttpServer())
      .get('/life-group-analytics/distribution')
      .query({ life_group_id: '7' })
      .expect(200);

    expect(distribution).toHaveBeenCalledTimes(1);
    const [query] = distribution.mock.calls[0] as [{ life_group_id: number }];
    expect(query.life_group_id).toBe(7);
  });
});
