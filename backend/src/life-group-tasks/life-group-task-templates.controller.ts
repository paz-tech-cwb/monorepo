import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LifeGroupTaskTemplatesService } from './life-group-task-templates.service';
import {
  CreateLifeGroupTaskTemplateDto,
  ReorderLifeGroupTaskTemplatesDto,
  UpdateLifeGroupTaskTemplateDto,
} from './dto/life-group-task-template.dto';

// Global task templates are admin-only (approved decision 2): the 'admin'
// role slug only, not pastor or any leadership role.
//
// @SerializeOptions: the service returns plain snake_case objects, which the
// global ClassSerializerInterceptor would otherwise strip to `{}`.
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@Controller('life-group-task-templates')
export class LifeGroupTaskTemplatesController {
  constructor(private readonly service: LifeGroupTaskTemplatesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateLifeGroupTaskTemplateDto) {
    return this.service.create(dto);
  }

  @Put('reorder')
  reorder(@Body() dto: ReorderLifeGroupTaskTemplatesDto) {
    return this.service.reorder(dto.templateIds);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLifeGroupTaskTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
