import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScopeGuard } from '../forms-core/guards/scope.guard';
import type { RequestWithScope } from '../forms-core/guards/scope.guard';
import { LifeGroupMeetingsService } from './life-group-meetings.service';
import { UpsertLifeGroupMeetingDto } from './dto/upsert-life-group-meeting.dto';

// No @Roles/@RolesGuard on purpose (same as life-group-attendance): a
// co-leader (or a leader whose role slug is `member`) must work, so access is
// scope-based plus the group's own leader/co-leader id fallback.
//
// @SerializeOptions is required: the service returns plain snake_case objects
// (no @Expose), which the global excludeAll/excludeExtraneousValues serializer
// would reduce to `{}`.
function parseExtraMeetingQuery(raw: unknown): boolean | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new BadRequestException(
    "extra_meeting must be 'true' or 'false' (lowercase).",
  );
}

@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })
@UseGuards(AuthGuard('jwt'), ScopeGuard)
@Controller('life-groups/:lifeGroupId/meetings')
export class LifeGroupMeetingsController {
  constructor(private readonly svc: LifeGroupMeetingsService) {}

  @Get(':date')
  get(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Param('date') date: string,
    @Req() req: RequestWithScope,
    // `?extra_meeting=true` previews a draft for an extra meeting (a date that
    // is not the group's fixed weekday). Ignored when a record already exists.
    // Only the exact (case-sensitive) strings 'true' / 'false' are accepted;
    // anything else is a 400. The preview does NOT check the weekly cap (the
    // PUT may still answer 409 extra_meeting_limit_reached).
    @Query('extra_meeting') extraMeeting?: string,
  ) {
    return this.svc.getMeeting(
      lifeGroupId,
      date,
      req.formScope,
      {
        id: req.user.id,
        isAdmin: req.user.role?.slug === 'admin',
        isPastor: req.user.role?.slug === 'pastor',
      },
      parseExtraMeetingQuery(extraMeeting),
    );
  }

  @Put(':date')
  upsert(
    @Param('lifeGroupId', ParseIntPipe) lifeGroupId: number,
    @Param('date') date: string,
    @Body() dto: UpsertLifeGroupMeetingDto,
    @Req() req: RequestWithScope,
  ) {
    return this.svc.upsertMeeting(lifeGroupId, date, dto, req.formScope, {
      id: req.user.id,
      isAdmin: req.user.role?.slug === 'admin',
      isPastor: req.user.role?.slug === 'pastor',
    });
  }
}
