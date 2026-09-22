import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';
import { JourneyProgressService } from './journey-progress.service';
import { ApproveStepDto } from './dto/approve-step.dto';
import { User } from '../users/entities/user.entity';

type AuthedRequest = Request & { user: User };

@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('journey-tracks')
export class JourneyTracksController {
  constructor(
    private readonly journeyProgressService: JourneyProgressService,
  ) {}

  @Get('me')
  getMyJourney(@Req() req: AuthedRequest) {
    return this.journeyProgressService.getCurrentTrackForMember(req.user.id);
  }

  @Get('member/:memberId')
  @Roles(...LEADERSHIP_ROLES)
  getMemberJourney(
    @Req() req: AuthedRequest,
    @Param('memberId') memberId: string,
  ) {
    return this.journeyProgressService.getForMemberScoped(req.user, +memberId);
  }

  @Post('member/:memberId/steps/:stepId/approve')
  @Roles(...LEADERSHIP_ROLES)
  approveStep(
    @Req() req: AuthedRequest,
    @Param('memberId') memberId: string,
    @Param('stepId') stepId: string,
    @Body() dto: ApproveStepDto,
  ) {
    return this.journeyProgressService.approveStep(
      req.user,
      +memberId,
      +stepId,
      dto.note,
    );
  }

  @Delete('member/:memberId/steps/:stepId/approve')
  @Roles(...LEADERSHIP_ROLES)
  revokeApproval(
    @Req() req: AuthedRequest,
    @Param('memberId') memberId: string,
    @Param('stepId') stepId: string,
  ) {
    return this.journeyProgressService.revokeApproval(
      req.user,
      +memberId,
      +stepId,
    );
  }
}
