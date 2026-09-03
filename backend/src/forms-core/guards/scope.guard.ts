import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from 'src/users/entities/user.entity';
import {
  ResolvedScope,
  ScopeResolverService,
} from '../services/scope-resolver.service';

interface RequestWithScope {
  user?: User;
  formScope?: ResolvedScope;
}

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolver: ScopeResolverService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithScope>();
    const user = req.user;
    if (!user) return false;
    req.formScope = await this.resolver.resolve(user.id);
    return true;
  }
}
