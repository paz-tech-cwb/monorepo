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
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LifeGroupsService } from './life-groups.service';
import { CreateLifeGroupDto } from './dto/create-life-group.dto';
import { UpdateLifeGroupDto } from './dto/update-life-group.dto';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('life-groups')
export class LifeGroupsController {
  constructor(private readonly lifeGroupsService: LifeGroupsService) {}

  @Post()
  create(@Body() createLifeGroupDto: CreateLifeGroupDto) {
    return this.lifeGroupsService.create(createLifeGroupDto);
  }

  @Get()
  findAll(@Query('q') q?: string) {
    if (q?.trim()) return this.lifeGroupsService.search(q);
    return this.lifeGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lifeGroupsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLifeGroupDto: UpdateLifeGroupDto,
  ) {
    return this.lifeGroupsService.update(id, updateLifeGroupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lifeGroupsService.remove(id);
  }

  @Post(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.lifeGroupsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.lifeGroupsService.removeMember(id, userId);
  }
}
