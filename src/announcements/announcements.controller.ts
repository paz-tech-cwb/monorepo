import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  SerializeOptions,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './entities/announcement.entity';

@Controller('announcements')
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  create(@Body() createAnnouncementDto: CreateAnnouncementDto): Promise<void> {
    return this.announcementsService.create(createAnnouncementDto);
  }

  @Get()
  findAll(): Promise<Announcement[]> {
    return this.announcementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Announcement> {
    return this.announcementsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    return this.announcementsService.update(+id, updateAnnouncementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(+id);
  }
}
