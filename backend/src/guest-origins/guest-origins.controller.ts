import {
  Body,
  Controller,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GuestOriginsService } from './guest-origins.service';
import { SetGuestOriginDto } from './dto/set-guest-origin.dto';

@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'))
@Controller('guest-origins')
export class GuestOriginsController {
  constructor(private readonly svc: GuestOriginsService) {}

  // Not consumed by any client yet (no onboarding UI in this phase) —
  // reserved for a future self-service origin-selection step.
  @Post('me')
  setMine(
    @Body() dto: SetGuestOriginDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.svc.setForUser(req.user.id, {
      originType: dto.originType,
      casaDePazId: dto.casaDePazId ?? null,
      invitedByUserId: dto.invitedByUserId ?? null,
      invitedByText: dto.invitedByText ?? null,
    });
  }
}
