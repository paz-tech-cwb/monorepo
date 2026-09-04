import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../users/entities/user.entity';
import {
  MinistryAccessResult,
  MinistryAccessService,
} from './ministry-access.service';
import { MINISTRY_FORM_KEY } from './ministry-form.decorator';

export interface RequestWithMinistryAccess {
  user?: User;
  ministryAccess?: MinistryAccessResult;
}

@Injectable()
export class MinistryFormGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: MinistryAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ministrySlug = this.reflector.getAllAndOverride<string | undefined>(
      MINISTRY_FORM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!ministrySlug) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithMinistryAccess>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    const roleSlug = request.user?.role?.slug;

    if (roleSlug === 'admin' || roleSlug === 'pastor') {
      request.ministryAccess = { isLeader: true, isMember: true };
      return true;
    }

    request.ministryAccess = await this.access.resolve(
      request.user.id,
      ministrySlug,
    );
    return true;
  }
}
