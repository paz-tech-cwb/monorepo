import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import {
  ResolvedScope,
  ScopeResolverService,
} from '../services/scope-resolver.service';

export interface RequestWithScope extends Request {
  user: User;
  formScope: ResolvedScope;
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
