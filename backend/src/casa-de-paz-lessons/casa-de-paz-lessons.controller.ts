import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';
import { CasaDePazLessonsService } from './casa-de-paz-lessons.service';
import { UpdateCasaDePazLessonDto } from './dto/update-casa-de-paz-lesson.dto';

// Required: CasaDePazLessonsService returns plain object literals (not
// @Expose()-decorated DTO classes), and the app's global
// ClassSerializerInterceptor defaults to excludeExtraneousValues: true,
// which would silently strip every field down to `{}` without this.
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('casa-de-paz-lessons')
export class CasaDePazLessonsController {
  constructor(private readonly svc: CasaDePazLessonsService) {}

  // Intentionally leadership-gated on read too (not just write) — lesson
  // content is prep material for Casa de Paz leaders, not guest-facing.
  // Precedent: AreasController's org-chart endpoint.
  @Get()
  @Roles(...LEADERSHIP_ROLES)
  list() {
    return this.svc.list();
  }

  @Patch(':week')
  @Roles(...LEADERSHIP_ROLES)
  update(
    @Param('week', ParseIntPipe) week: number,
    @Body() dto: UpdateCasaDePazLessonDto,
  ) {
    return this.svc.update(week, dto);
  }
}
