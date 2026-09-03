import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MinistriesService } from './ministries.service';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { CreateMinistryTeamDto } from './dto/create-ministry-team.dto';
import { UpdateMinistryTeamDto } from './dto/update-ministry-team.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('ministries')
export class MinistriesController {
  constructor(private readonly svc: MinistriesService) {}

  @Get()
  findAllMinistries() {
    return this.svc.findAllMinistries();
  }

  @Get('teams/all')
  findAllTeams(
    @Query('ministry_id', new ParseIntPipe({ optional: true }))
    ministryId?: number,
  ) {
    return this.svc.findAllTeams(ministryId);
  }

  @Get(':id')
  findMinistry(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findMinistry(id);
  }

  @Post()
  createMinistry(@Body() dto: CreateMinistryDto) {
    return this.svc.createMinistry(dto);
  }

  @Put(':id')
  updateMinistry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMinistryDto,
  ) {
    return this.svc.updateMinistry(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMinistry(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteMinistry(id);
  }

  @Post('teams')
  createTeam(@Body() dto: CreateMinistryTeamDto) {
    return this.svc.createTeam(dto);
  }

  @Put('teams/:id')
  updateTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMinistryTeamDto,
  ) {
    return this.svc.updateTeam(id, dto);
  }

  @Delete('teams/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTeam(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteTeam(id);
  }

  @Post(':id/members/:userId')
  addMinistryMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.svc.addMinistryMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMinistryMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.svc.removeMinistryMember(id, userId);
  }

  @Post('teams/:id/members/:userId')
  addTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.svc.addTeamMember(id, userId);
  }

  @Delete('teams/:id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.svc.removeTeamMember(id, userId);
  }
}
