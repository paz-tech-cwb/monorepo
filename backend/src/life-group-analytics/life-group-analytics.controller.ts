import {
  Controller,
  Get,
  Query,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { LifeGroupAnalyticsService } from './life-group-analytics.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { DistributionQueryDto } from './dto/distribution-query.dto';

// @SerializeOptions is required here: the service returns plain object
// literals (not @Expose()-decorated DTO classes), and the app's global
// ClassSerializerInterceptor defaults to excludeExtraneousValues: true,
// which silently strips every field from a plain object down to `{}`.
// Same bug fixed in life-group-attendance.controller.ts during Phase 1.
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('life-group-analytics')
export class LifeGroupAnalyticsController {
  constructor(private readonly svc: LifeGroupAnalyticsService) {}

  @Get('attendance')
  attendance(@Query() query: AttendanceQueryDto, @Req() req: RequestWithScope) {
    return this.svc.attendance(query, req.formScope, { id: req.user.id });
  }

  @Get('distribution')
  distribution(
    @Query() query: DistributionQueryDto,
    @Req() req: RequestWithScope,
  ) {
    return this.svc.distribution(query, req.formScope, { id: req.user.id });
  }
}
