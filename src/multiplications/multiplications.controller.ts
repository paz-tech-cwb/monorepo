import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MultiplicationsService } from './multiplications.service';
import { CreateMultiplicationDto } from './dto/create-multiplication.dto';
import { UpdateMultiplicationDto } from './dto/update-multiplication.dto';

@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('forms/multiplications')
export class MultiplicationsController {
  constructor(private readonly svc: MultiplicationsService) {}

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
  @Roles('admin', 'pastor', 'area_leader')
  create(@Body() dto: CreateMultiplicationDto, @Req() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMultiplicationDto, @Req() req: any) {
    return this.svc.update(id, dto, { id: req.user.id, roleSlug: req.user.role?.slug ?? 'member' });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.softDelete(id, { id: req.user.id, roleSlug: req.user.role?.slug ?? 'member' });
  }
}
