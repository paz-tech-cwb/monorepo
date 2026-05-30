import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LifeGroupReportsService } from './life-group-reports.service';
import { CreateLifeGroupReportDto } from './dto/create-life-group-report.dto';
import { UpdateLifeGroupReportDto } from './dto/update-life-group-report.dto';

@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('forms/life-group-reports')
export class LifeGroupReportsController {
  constructor(private readonly svc: LifeGroupReportsService) {}

  @Get()
  list(@Req() req: any) {
    return this.svc.list(req.formScope);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/audit')
  audit(@Param('id') id: string) {
    return this.svc.auditLog(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader')
  create(@Body() dto: CreateLifeGroupReportDto, @Req() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLifeGroupReportDto, @Req() req: any) {
    return this.svc.update(id, dto, { id: req.user.id, roleSlug: req.user.role?.slug ?? 'member' });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.softDelete(id, { id: req.user.id, roleSlug: req.user.role?.slug ?? 'member' });
  }
}
