import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MinistryFormGuard } from './ministry-form.guard';
import { MinistryAccessService } from './ministry-access.service';
import { MINISTRY_FORM_KEY } from './ministry-form.decorator';

function makeContext(user: any) {
  const req: any = { user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('MinistryFormGuard', () => {
  let guard: MinistryFormGuard;
  let reflector: Reflector;
  let access: { resolve: jest.Mock };

  beforeEach(() => {
    reflector = new Reflector();
    access = { resolve: jest.fn() };
    guard = new MinistryFormGuard(reflector, access as unknown as MinistryAccessService);
  });

  it('bypasses to full access for admin without querying ministry tables', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('atmosfera');
    const ctx = makeContext({ id: 1, role: { slug: 'admin' } });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).ministryAccess).toEqual({
      isLeader: true,
      isMember: true,
    });
    expect(access.resolve).not.toHaveBeenCalled();
  });

  it('bypasses to full access for pastor', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('atmosfera');
    const ctx = makeContext({ id: 1, role: { slug: 'pastor' } });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).ministryAccess).toEqual({
      isLeader: true,
      isMember: true,
    });
  });

  it('delegates to MinistryAccessService for non-admin/pastor roles', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('atmosfera');
    access.resolve.mockResolvedValue({ isLeader: false, isMember: true });
    const ctx = makeContext({ id: 10, role: { slug: 'member' } });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect(access.resolve).toHaveBeenCalledWith(10, 'atmosfera');
    expect((ctx.switchToHttp().getRequest() as any).ministryAccess).toEqual({
      isLeader: false,
      isMember: true,
    });
  });

  it('allows the request through with no ministry slug metadata (no-op)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({ id: 10, role: { slug: 'member' } });

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect(access.resolve).not.toHaveBeenCalled();
  });

  it('rejects with UnauthorizedException when request.user is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('atmosfera');
    const ctx = makeContext(undefined);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(access.resolve).not.toHaveBeenCalled();
  });
});
