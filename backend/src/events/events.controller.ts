import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';
import { User } from '../users/entities/user.entity';

@Controller('events')
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...LEADERSHIP_ROLES)
  create(
    @Request() req: { user: User },
    @Body() createEventDto: CreateEventDto,
  ) {
    if (!req.user.churchId) {
      throw new BadRequestException(
        'User has no associated church; cannot create an event.',
      );
    }
    return this.eventsService.create(createEventDto, req.user.churchId);
  }

  // No auth guard: this is a public/mobile read endpoint. When called
  // unauthenticated (no req.user), results are unscoped across all
  // filiais, matching the prior single-church behavior.
  @Get()
  findAll(
    @Request() req: { user?: User },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const churchId = req.user?.churchId ?? undefined;
    if (page !== undefined && limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      return this.eventsService.findPaginated(pageNum, limitNum, churchId);
    }
    return this.eventsService.findAll(churchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...LEADERSHIP_ROLES)
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(+id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...LEADERSHIP_ROLES)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(+id);
  }
}
