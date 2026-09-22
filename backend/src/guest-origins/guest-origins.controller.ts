import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuestOriginsService } from './guest-origins.service';
import { SetGuestOriginDto } from './dto/set-guest-origin.dto';
import { User } from '../users/entities/user.entity';

@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'))
@Controller('guest-origins')
export class GuestOriginsController {
  constructor(
    private readonly svc: GuestOriginsService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // Not consumed by any client yet (no onboarding UI in this phase) —
  // reserved for a future self-service origin-selection step.
  @Post('me')
  async setMine(
    @Body() dto: SetGuestOriginDto,
    @Req() req: { user: { id: number } },
  ) {
    if (dto.invitedByUserId != null) {
      const inviter = await this.userRepo.findOne({
        where: { id: dto.invitedByUserId },
      });
      if (!inviter) {
        throw new BadRequestException('invitedByUserId does not exist');
      }
    }
    return this.svc.setForUser(req.user.id, {
      originType: dto.originType,
      casaDePazId: dto.casaDePazId ?? null,
      invitedByUserId: dto.invitedByUserId ?? null,
      invitedByText: dto.invitedByText ?? null,
    });
  }
}
