import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LifeGroupReportsService } from './life-group-reports.service';
import { CreateLifeGroupReportDto } from './dto/create-life-group-report.dto';
import { UpdateLifeGroupReportDto } from './dto/update-life-group-report.dto';
import { ListLifeGroupReportsQueryDto } from './dto/list-life-group-reports-query.dto';

// Required: the service returns plain snake_case objects (no @Expose), which
// the global excludeAll/excludeExtraneousValues serializer would reduce to `{}`.
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('forms/life-group-reports')
export class LifeGroupReportsController {
  constructor(private readonly svc: LifeGroupReportsService) {}

  @Get()
  list(
    @Req() req: RequestWithScope,
    @Query() query: ListLifeGroupReportsQueryDto,
  ) {
    return this.svc.list(
      req.formScope,
      { id: req.user.id },
      query.life_group_id,
    );
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
  create(@Body() dto: CreateLifeGroupReportDto, @Req() req: RequestWithScope) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLifeGroupReportDto,
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
