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
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';
import { CasaDePazAnalyticsService } from './casa-de-paz-analytics.service';
import { CasaDePazSummaryQueryDto } from './dto/casa-de-paz-summary-query.dto';

// @SerializeOptions is required here: the service returns a plain object
// literal (not an @Expose()-decorated DTO class), and the app's global
// ClassSerializerInterceptor defaults to excludeExtraneousValues: true,
// which silently strips every field from a plain object down to `{}` —
// same fix applied to life-group-analytics.controller.ts.
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'), ScopeGuard, RolesGuard)
@Roles(...LEADERSHIP_ROLES)
@Controller('casa-de-paz-analytics')
export class CasaDePazAnalyticsController {
  constructor(private readonly svc: CasaDePazAnalyticsService) {}

  @Get('summary')
  summary(
    @Query() query: CasaDePazSummaryQueryDto,
    @Req() req: RequestWithScope,
  ) {
    return this.svc.summary(query, req.formScope);
  }
}
