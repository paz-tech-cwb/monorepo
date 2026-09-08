import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  SerializeOptions,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';
import { LifeGroupsService } from './life-groups.service';
import { CreateLifeGroupDto } from './dto/create-life-group.dto';
import { UpdateLifeGroupDto } from './dto/update-life-group.dto';
import { User } from '../users/entities/user.entity';

interface AuthenticatedRequest {
  user: User;
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('life-groups')
export class LifeGroupsController {
  constructor(private readonly lifeGroupsService: LifeGroupsService) {}

  @Post()
  @Roles(...LEADERSHIP_ROLES)
  create(@Body() createLifeGroupDto: CreateLifeGroupDto) {
    return this.lifeGroupsService.create(createLifeGroupDto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query('q') q?: string) {
    if (q?.trim()) return this.lifeGroupsService.search(q);
    return this.lifeGroupsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.lifeGroupsService.findOne(id, req.user);
  }

  @Put(':id')
  @Roles(...LEADERSHIP_ROLES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLifeGroupDto: UpdateLifeGroupDto,
  ) {
    return this.lifeGroupsService.update(id, updateLifeGroupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...LEADERSHIP_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lifeGroupsService.remove(id);
  }

  @Post(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...LEADERSHIP_ROLES)
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.lifeGroupsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...LEADERSHIP_ROLES)
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.lifeGroupsService.removeMember(id, userId);
  }
}
