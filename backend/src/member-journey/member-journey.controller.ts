import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  SerializeOptions,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { MemberJourneyService } from './member-journey.service';
import { UpdateMemberStageDto } from './dto/update-member-stage.dto';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('member-journey')
export class MemberJourneyController {
  constructor(private readonly memberJourneyService: MemberJourneyService) {}

  @Get('stats')
  getStats() {
    return this.memberJourneyService.getStats();
  }

  @Get('filters')
  getFilterOptions() {
    return this.memberJourneyService.getFilterOptions();
  }

  @Get('feed')
  getFeed(
    @Query('stage_id') stageId?: string,
    @Query('life_group_id') lifeGroupId?: string,
    @Query('ministry_id') ministryId?: string,
    @Query('sector_id') sectorId?: string,
    @Query('area_id') areaId?: string,
    @Query('role') role?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.memberJourneyService.getFeed({
      stage_id: stageId ? parseInt(stageId, 10) : undefined,
      life_group_id: lifeGroupId ? parseInt(lifeGroupId, 10) : undefined,
      ministry_id: ministryId ? parseInt(ministryId, 10) : undefined,
      sector_id: sectorId ? parseInt(sectorId, 10) : undefined,
      area_id: areaId ? parseInt(areaId, 10) : undefined,
      role,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      per_page: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get('me')
  getMyJourney(@Req() req: Request & { user: { id: number } }) {
    return this.memberJourneyService.getMyJourney(req.user.id);
  }

  @Get(':memberId')
  getMemberJourney(@Param('memberId') memberId: string) {
    return this.memberJourneyService.getMemberJourney(+memberId);
  }

  @Patch(':memberId/stage')
  updateStage(
    @Param('memberId') memberId: string,
    @Body() updateMemberStageDto: UpdateMemberStageDto,
  ) {
    return this.memberJourneyService.updateStage(
      +memberId,
      updateMemberStageDto,
    );
  }
}
