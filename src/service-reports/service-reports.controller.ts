import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MinistryForm } from '../ministry-access/ministry-form.decorator';
import { MinistryFormGuard } from '../ministry-access/ministry-form.guard';
import { ServiceReportsService } from './service-reports.service';
import { CreateServiceReportDto } from './dto/create-service-report.dto';
import { UpdateServiceReportDto } from './dto/update-service-report.dto';

@UseGuards(AuthGuard('jwt'), MinistryFormGuard)
@MinistryForm('atmosfera')
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('forms/service-reports')
export class ServiceReportsController {
  constructor(private readonly svc: ServiceReportsService) {}

  @Get()
  list(@Req() req: any) {
    if (!req.ministryAccess.isLeader) {
      throw new ForbiddenException();
    }
    return this.svc.listAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    if (!req.ministryAccess.isLeader) {
      throw new ForbiddenException();
    }
    return this.svc.findOne(id);
  }

  @Get(':id/audit')
  audit(@Param('id') id: string, @Req() req: any) {
    if (!req.ministryAccess.isLeader) {
      throw new ForbiddenException();
    }
    return this.svc.auditLog(id);
  }

  @Post()
  create(@Body() dto: CreateServiceReportDto, @Req() req: any) {
    if (!req.ministryAccess.isMember && !req.ministryAccess.isLeader) {
      throw new ForbiddenException();
    }
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceReportDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, dto, {
      id: req.user.id,
      roleSlug: req.user.role?.slug ?? 'member',
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.softDelete(id, {
      id: req.user.id,
      roleSlug: req.user.role?.slug ?? 'member',
    });
  }
}
