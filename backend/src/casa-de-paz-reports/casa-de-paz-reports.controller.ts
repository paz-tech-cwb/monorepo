import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CasaDePazReportsService } from './casa-de-paz-reports.service';
import { CreateCasaDePazReportDto } from './dto/create-casa-de-paz-report.dto';
import { UpdateCasaDePazReportDto } from './dto/update-casa-de-paz-report.dto';

// Required: CasaDePazReportsService returns plain snake_case object literals
// (not @Expose()-decorated DTO classes), and the app's global
// ClassSerializerInterceptor defaults to excludeExtraneousValues: true,
// which would silently strip every field down to `{}` without this.
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('forms/casa-de-paz-reports')
export class CasaDePazReportsController {
  constructor(private readonly svc: CasaDePazReportsService) {}

  @Get()
  list(@Req() req: RequestWithScope) {
    return this.svc.list(req.formScope, { id: req.user.id });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithScope) {
    return this.svc.findOne(id, req.formScope, { id: req.user.id });
  }

  @Get(':id/audit')
  audit(@Param('id') id: string, @Req() req: RequestWithScope) {
    return this.svc.auditLog(id, req.formScope, { id: req.user.id });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader')
  create(@Body() dto: CreateCasaDePazReportDto, @Req() req: RequestWithScope) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCasaDePazReportDto,
    @Req() req: RequestWithScope,
  ) {
    return this.svc.update(id, dto, {
      id: req.user.id,
      roleSlug: req.user.role?.slug ?? 'member',
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithScope) {
    return this.svc.softDelete(id, {
      id: req.user.id,
      roleSlug: req.user.role?.slug ?? 'member',
    });
  }
}
