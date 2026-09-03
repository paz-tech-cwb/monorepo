import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeResolverService } from '../services/scope-resolver.service';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolver: ScopeResolverService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    req.formScope = await this.resolver.resolve(user.id);
    return true;
  }
}
