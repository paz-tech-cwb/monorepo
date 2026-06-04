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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberRegistrationsService } from './member-registrations.service';
import { CreateMemberRegistrationDto } from './dto/create-member-registration.dto';
import { UpdateMemberRegistrationDto } from './dto/update-member-registration.dto';

@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('forms/member-registrations')
export class MemberRegistrationsController {
  constructor(private readonly svc: MemberRegistrationsService) {}

  @Get()
  list(@Req() req: any) {
    return this.svc.list(req.formScope);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOne(id, req.formScope);
  }

  @Get(':id/audit')
  audit(@Param('id') id: string, @Req() req: any) {
    return this.svc.auditLog(id, req.formScope);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader', 'life_group_leader')
  create(@Body() dto: CreateMemberRegistrationDto, @Req() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMemberRegistrationDto,
    @Req() req: any,
  ) {
    return this.svc.update(
      id,
      dto,
      { id: req.user.id, roleSlug: req.user.role?.slug ?? 'member' },
      req.formScope,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.softDelete(
      id,
      { id: req.user.id, roleSlug: req.user.role?.slug ?? 'member' },
      req.formScope,
    );
  }
}
