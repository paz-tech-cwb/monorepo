import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ReachDto } from './dto/reach.dto';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  create(
    @Body() dto: CreateNotificationDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.notificationsService.create(dto, req.user.id);
  }

  // NOTE: 'reach' must be declared before ':id' to prevent route collision
  @Post('reach')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader')
  getReach(@Body() dto: ReachDto) {
    return this.notificationsService.getReach(
      dto.segment,
      dto.channels,
      dto.category,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader')
  findAll(@Query('origin') origin?: 'manual' | 'automatic') {
    return this.notificationsService.findAll(origin);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor', 'area_leader', 'sector_leader')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'pastor')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }
}
