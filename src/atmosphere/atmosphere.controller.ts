import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AtmosphereService } from './atmosphere.service';
import { CreateAtmosphereMinistryDto } from './dto/create-atmosphere-ministry.dto';
import { UpdateAtmosphereMinistryDto } from './dto/update-atmosphere-ministry.dto';
import { CreateAtmosphereTeamDto } from './dto/create-atmosphere-team.dto';
import { UpdateAtmosphereTeamDto } from './dto/update-atmosphere-team.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('atmosphere')
export class AtmosphereController {
  constructor(private readonly svc: AtmosphereService) {}

  @Get('ministries') findAllMinistries() { return this.svc.findAllMinistries(); }
  @Post('ministries') createMinistry(@Body() dto: CreateAtmosphereMinistryDto) { return this.svc.createMinistry(dto); }
  @Put('ministries/:id') updateMinistry(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAtmosphereMinistryDto) { return this.svc.updateMinistry(id, dto); }
  @Delete('ministries/:id') @HttpCode(HttpStatus.NO_CONTENT) deleteMinistry(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteMinistry(id); }

  @Get('teams') findAllTeams(@Query('ministry_id', new ParseIntPipe({ optional: true })) ministryId?: number) { return this.svc.findAllTeams(ministryId); }
  @Post('teams') createTeam(@Body() dto: CreateAtmosphereTeamDto) { return this.svc.createTeam(dto); }
  @Put('teams/:id') updateTeam(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAtmosphereTeamDto) { return this.svc.updateTeam(id, dto); }
  @Delete('teams/:id') @HttpCode(HttpStatus.NO_CONTENT) deleteTeam(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteTeam(id); }

  @Post('ministries/:id/members/:userId')
  addMinistryMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) { return this.svc.addMinistryMember(id, userId); }

  @Delete('ministries/:id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMinistryMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) { return this.svc.removeMinistryMember(id, userId); }

  @Post('teams/:id/members/:userId')
  addTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) { return this.svc.addTeamMember(id, userId); }

  @Delete('teams/:id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) { return this.svc.removeTeamMember(id, userId); }
}
