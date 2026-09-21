import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JourneyTracksService } from './journey-tracks.service';
import { CreateJourneyTrackDto } from './dto/create-journey-track.dto';
import { UpdateJourneyTrackDto } from './dto/update-journey-track.dto';
import { CreateJourneyTrackStepDto } from './dto/create-journey-track-step.dto';
import { UpdateJourneyTrackStepDto } from './dto/update-journey-track-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('journey-tracks/admin')
export class JourneyTracksAdminController {
  constructor(private readonly journeyTracksService: JourneyTracksService) {}

  @Get()
  findAll() {
    return this.journeyTracksService.findAllForAdmin();
  }

  @Post()
  create(@Body() dto: CreateJourneyTrackDto) {
    return this.journeyTracksService.createTrack(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJourneyTrackDto) {
    return this.journeyTracksService.updateTrack(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.journeyTracksService.removeTrack(+id);
  }

  @Post(':id/steps')
  createStep(@Param('id') id: string, @Body() dto: CreateJourneyTrackStepDto) {
    return this.journeyTracksService.createStep(+id, dto);
  }

  @Put(':id/steps/reorder')
  reorderSteps(@Param('id') id: string, @Body() dto: ReorderStepsDto) {
    return this.journeyTracksService.reorderSteps(+id, dto);
  }

  @Put(':id/steps/:stepId')
  updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateJourneyTrackStepDto,
  ) {
    return this.journeyTracksService.updateStep(+id, +stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  removeStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    return this.journeyTracksService.removeStep(+id, +stepId);
  }
}
