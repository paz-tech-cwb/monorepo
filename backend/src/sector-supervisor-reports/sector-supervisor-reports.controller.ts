import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SectorSupervisorReportsService } from './sector-supervisor-reports.service';
import { CreateSectorSupervisorReportDto } from './dto/create-sector-supervisor-report.dto';
import { UpdateSectorSupervisorReportDto } from './dto/update-sector-supervisor-report.dto';

@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('forms/sector-supervisor-reports')
export class SectorSupervisorReportsController {
  constructor(private readonly svc: SectorSupervisorReportsService) {}

  @Get()
  list(@Req() req: RequestWithScope) {
    return this.svc.list(req.formScope!);
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
  @Roles('admin', 'pastor', 'sector_leader')
  create(
    @Body() dto: CreateSectorSupervisorReportDto,
    @Req() req: RequestWithScope,
  ) {
    return this.svc.create(dto, req.user!.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSectorSupervisorReportDto,
    @Req() req: RequestWithScope,
  ) {
    return this.svc.update(id, dto, {
      id: req.user!.id,
      roleSlug: req.user!.role?.slug ?? 'member',
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithScope) {
    return this.svc.softDelete(id, {
      id: req.user!.id,
      roleSlug: req.user!.role?.slug ?? 'member',
    });
  }
}
