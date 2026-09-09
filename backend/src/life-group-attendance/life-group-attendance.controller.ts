import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import { LifeGroupAttendanceService } from './life-group-attendance.service';
import { UpsertLifeGroupAttendanceDto } from './dto/upsert-life-group-attendance.dto';

// No @Roles/@RolesGuard here on purpose: a co-leader has no dedicated
// leadership role slug (they may just be a 'member'), so authorization is
// entirely scope-based — ScopeGuard resolves what the requesting user's
// role grants them, and LifeGroupAttendanceService additionally allows the
// group's own co_leader_id even when scope alone wouldn't. Mirrors the
// life-group-reports controller's approach.
@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('life-groups/:lifeGroupId/attendance')
export class LifeGroupAttendanceController {
  constructor(private readonly svc: LifeGroupAttendanceService) {}

  @Get()
  list(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Req() req: any,
  ) {
    return this.svc.list(lifeGroupId, req.formScope, { id: req.user.id });
  }

  @Get(':date')
  getByDate(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Param('date') date: string,
    @Req() req: any,
  ) {
    return this.svc.getByDate(lifeGroupId, date, req.formScope, {
      id: req.user.id,
    });
  }

  @Put(':date')
  upsert(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Param('date') date: string,
    @Body() dto: UpsertLifeGroupAttendanceDto,
    @Req() req: any,
  ) {
    return this.svc.upsert(lifeGroupId, date, dto, req.formScope, {
      id: req.user.id,
    });
  }
}
