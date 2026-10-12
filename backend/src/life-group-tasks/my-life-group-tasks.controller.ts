import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../users/entities/user.entity';
import { LifeGroupTaskAssignmentsService } from './life-group-task-assignments.service';

interface AuthenticatedRequest {
  user: User;
}

// Member-facing: every handler is scoped strictly to req.user.id and the
// service builds responses from an explicit field list, so the leader's
// eligibility notes can never reach these endpoints.
@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'))
@Controller('me/life-group-tasks')
export class MyLifeGroupTasksController {
  constructor(private readonly assignments: LifeGroupTaskAssignmentsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.assignments.listMine({ id: req.user.id });
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assignments.getMine(id, { id: req.user.id });
  }

  @Post(':id/decline')
  @HttpCode(200)
  decline(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assignments.decline(id, { id: req.user.id });
  }
}
