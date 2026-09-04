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
import { FormConversionsService } from './form-conversions.service';
import { CreateFormConversionDto } from './dto/create-form-conversion.dto';
import { UpdateFormConversionDto } from './dto/update-form-conversion.dto';

@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('forms/form-conversions')
export class FormConversionsController {
  constructor(private readonly svc: FormConversionsService) {}

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
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader')
  create(@Body() dto: CreateFormConversionDto, @Req() req: RequestWithScope) {
    return this.svc.create(dto, req.user!.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFormConversionDto,
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
