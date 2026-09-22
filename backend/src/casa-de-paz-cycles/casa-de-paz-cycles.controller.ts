import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CasaDePazCyclesService } from './casa-de-paz-cycles.service';
import { CreateCasaDePazCycleDto } from './dto/create-casa-de-paz-cycle.dto';

// Required: CasaDePazCyclesService returns plain object literals (not
// @Expose()-decorated DTO classes), and the app's global
// ClassSerializerInterceptor defaults to excludeExtraneousValues: true,
// which would silently strip every field down to `{}` without this.
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'))
@Controller('casa-de-paz-cycles')
export class CasaDePazCyclesController {
  constructor(private readonly svc: CasaDePazCyclesService) {}

  // Any authenticated user (including guests) can list cycles — no
  // leadership gate here, so the future guest-facing picker can consume
  // this endpoint without additional access changes.
  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  create(
    @Body() dto: CreateCasaDePazCycleDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id/close')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  close(@Param('id') id: string) {
    return this.svc.close(id);
  }
}
