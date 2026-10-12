import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  SerializeOptions,
  ParseIntPipe,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { User } from '../users/entities/user.entity';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @Roles(...LEADERSHIP_ROLES)
  create(@Request() req: { user: User }, @Body() createAreaDto: CreateAreaDto) {
    if (!req.user.churchId) {
      throw new BadRequestException(
        'User has no associated church; cannot create an area.',
      );
    }
    return this.areasService.create(createAreaDto, req.user.churchId);
  }

  @Get()
  findAll(@Request() req: { user: User }) {
    return this.areasService.findAll(req.user.churchId ?? undefined);
  }

  @Get('hierarchy')
  getHierarchy(@Request() req: { user: User }) {
    return this.areasService.getHierarchy(req.user.churchId ?? undefined);
  }

  @Get('org-chart')
  @Roles(...LEADERSHIP_ROLES)
  getOrgChart(@Request() req: { user: User }) {
    return this.areasService.getOrgChart(req.user.churchId ?? undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.areasService.findOne(id);
  }

  @Put(':id')
  @Roles(...LEADERSHIP_ROLES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAreaDto: UpdateAreaDto,
  ) {
    return this.areasService.update(id, updateAreaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...LEADERSHIP_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.areasService.remove(id);
  }
}
