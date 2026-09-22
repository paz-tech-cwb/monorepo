import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CasaDePazAnalyticsController } from './casa-de-paz-analytics.controller';
import { CasaDePazAnalyticsService } from './casa-de-paz-analytics.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';

function makeContext(roleSlug: string | undefined): ExecutionContext {
  return {
    getHandler: () => function summaryHandler() {},
    getClass: () => CasaDePazAnalyticsController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { slug: roleSlug } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('CasaDePazAnalyticsController', () => {
  it('registers AuthGuard(jwt), ScopeGuard and RolesGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CasaDePazAnalyticsController,
    ) as unknown[];
    expect(guards).toHaveLength(3);
    expect(typeof guards[0]).toBe('function'); // AuthGuard('jwt') mixin
    expect(typeof guards[1]).toBe('function'); // ScopeGuard
    expect(guards[2]).toBe(RolesGuard);
  });

  it('restricts /summary to LEADERSHIP_ROLES via RolesGuard', () => {
    const guard = new RolesGuard(new Reflector());

    for (const role of LEADERSHIP_ROLES) {
      expect(guard.canActivate(makeContext(role))).toBe(true);
    }

    expect(guard.canActivate(makeContext('member'))).toBe(false);
    expect(guard.canActivate(makeContext('lead'))).toBe(false);
    expect(guard.canActivate(makeContext('discipler'))).toBe(false);
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });

  it('summary() delegates to the service with the query params and the request formScope', async () => {
    const svc = { summary: jest.fn().mockResolvedValue({}) };
    const controller = new CasaDePazAnalyticsController(
      svc as unknown as CasaDePazAnalyticsService,
    );
    const query = { from: '2026-01-01', to: '2026-06-30' };
    const formScope = {
      unrestricted: false,
      areaIds: [],
      sectorIds: [3],
      lifeGroupIds: [],
    };
    const req = { formScope } as never;

    await controller.summary(query as never, req);

    expect(svc.summary).toHaveBeenCalledWith(query, formScope);
  });
});
