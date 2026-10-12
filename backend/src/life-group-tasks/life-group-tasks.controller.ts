import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { LifeGroupTaskConfigService } from './life-group-task-config.service';
import { LifeGroupTaskAssignmentsService } from './life-group-task-assignments.service';
import {
  TaskMeetingDateDto,
  UpdateTaskSettingsDto,
  UpsertTaskMembersDto,
  UpsertTaskOverridesDto,
} from './dto/life-group-task-config.dto';
import {
  GenerateTasksDto,
  ReassignTaskDto,
  RerollTaskDto,
} from './dto/life-group-task-assignment.dto';

// No @Roles/@RolesGuard on purpose (same as LifeGroupAttendanceController):
// a co-leader has no dedicated role slug, so authorization is scope-based
// (ScopeGuard) plus the leader/co-leader fallback in the services.
//
// @SerializeOptions is required because the services return plain
// snake_case objects (see LifeGroupAttendanceController).
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('life-groups/:lifeGroupId')
export class LifeGroupTasksController {
  constructor(
    private readonly config: LifeGroupTaskConfigService,
    private readonly assignments: LifeGroupTaskAssignmentsService,
  ) {}

  // ---- overrides -------------------------------------------------------

  @Get('task-overrides')
  getOverrides(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Req() req: RequestWithScope,
  ) {
    return this.config.getOverrides(lifeGroupId, req.formScope, {
      id: req.user.id,
    });
  }

  @Put('task-overrides')
  putOverrides(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Body() dto: UpsertTaskOverridesDto,
    @Req() req: RequestWithScope,
  ) {
    return this.config.putOverrides(lifeGroupId, dto.overrides, req.formScope, {
      id: req.user.id,
    });
  }

  // ---- member eligibility ---------------------------------------------

  @Get('task-members')
  getMembers(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Req() req: RequestWithScope,
  ) {
    return this.config.getMembers(lifeGroupId, req.formScope, {
      id: req.user.id,
    });
  }

  @Put('task-members')
  putMembers(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Body() dto: UpsertTaskMembersDto,
    @Req() req: RequestWithScope,
  ) {
    return this.config.putMembers(lifeGroupId, dto.members, req.formScope, {
      id: req.user.id,
    });
  }

  // ---- group settings --------------------------------------------------

  @Get('task-settings')
  getSettings(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Req() req: RequestWithScope,
  ) {
    return this.config.getSettings(lifeGroupId, req.formScope, {
      id: req.user.id,
    });
  }

  @Put('task-settings')
  putSettings(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Body() dto: UpdateTaskSettingsDto,
    @Req() req: RequestWithScope,
  ) {
    return this.config.putSettings(
      lifeGroupId,
      dto.minPresentMeetings,
      req.formScope,
      { id: req.user.id },
    );
  }

  // ---- skipped dates ---------------------------------------------------

  @Get('task-skips')
  listSkips(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Req() req: RequestWithScope,
  ) {
    return this.config.listSkips(lifeGroupId, req.formScope, {
      id: req.user.id,
    });
  }

  @Post('task-skips')
  addSkip(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Body() dto: TaskMeetingDateDto,
    @Req() req: RequestWithScope,
  ) {
    return this.config.addSkip(lifeGroupId, dto.meetingDate, req.formScope, {
      id: req.user.id,
    });
  }

  @Delete('task-skips/:date')
  @HttpCode(204)
  removeSkip(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Param('date') date: string,
    @Req() req: RequestWithScope,
  ): Promise<void> {
    return this.config.removeSkip(lifeGroupId, date, req.formScope, {
      id: req.user.id,
    });
  }

  // ---- assignments -----------------------------------------------------

  @Get('tasks')
  list(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Query('date') date: string,
    @Req() req: RequestWithScope,
  ) {
    return this.assignments.list(lifeGroupId, date, req.formScope, {
      id: req.user.id,
    });
  }

  @Post('tasks/generate')
  generate(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Body() dto: GenerateTasksDto,
    @Req() req: RequestWithScope,
  ) {
    return this.assignments.generate(
      lifeGroupId,
      dto.meetingDate,
      req.formScope,
      { id: req.user.id },
    );
  }

  @Post('tasks/reroll')
  @HttpCode(200)
  reroll(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Body() dto: RerollTaskDto,
    @Req() req: RequestWithScope,
  ) {
    return this.assignments.reroll(
      lifeGroupId,
      dto.assignmentId,
      req.formScope,
      { id: req.user.id },
    );
  }

  @Patch('tasks/:assignmentId')
  reassign(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: ReassignTaskDto,
    @Req() req: RequestWithScope,
  ) {
    return this.assignments.reassign(
      lifeGroupId,
      assignmentId,
      dto.userId,
      req.formScope,
      { id: req.user.id },
    );
  }
}
