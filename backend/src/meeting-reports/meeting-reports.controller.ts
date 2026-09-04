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
import {
  MeetingReportsFilters,
  MeetingReportsService,
} from './meeting-reports.service';
import { CreateMeetingReportDto } from './dto/create-meeting-report.dto';
import { UpdateMeetingReportDto } from './dto/update-meeting-report.dto';

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('meeting-reports')
export class MeetingReportsController {
  constructor(private readonly meetingReportsService: MeetingReportsService) {}

  @Post()
  create(@Body() createMeetingReportDto: CreateMeetingReportDto) {
    return this.meetingReportsService.create(createMeetingReportDto);
  }

  @Get()
  findAll(
    @Query('life_group_id') lifeGroupId?: string,
    @Query('leader_id') leaderId?: string,
    @Query('area_id') areaId?: string,
    @Query('sector_id') sectorId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const filters: MeetingReportsFilters = {};
    if (lifeGroupId) filters.life_group_id = parseInt(lifeGroupId, 10);
    if (leaderId) filters.leader_id = parseInt(leaderId, 10);
    if (areaId) filters.area_id = parseInt(areaId, 10);
    if (sectorId) filters.sector_id = parseInt(sectorId, 10);
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    return this.meetingReportsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.meetingReportsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMeetingReportDto: UpdateMeetingReportDto,
  ) {
    return this.meetingReportsService.update(id, updateMeetingReportDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.meetingReportsService.remove(id);
  }
}
