import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  create(@Body() createAnnouncementDto: CreateAnnouncementDto): Promise<void> {
    return this.announcementsService.create(createAnnouncementDto);
  }

  @Get()
  async findAll(): Promise<AnnouncementResponseDto[]> {
    const announcements = await this.announcementsService.findAll();
    return plainToInstance(AnnouncementResponseDto, announcements, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AnnouncementResponseDto> {
    const announcement = await this.announcementsService.findOne(+id);
    return plainToInstance(AnnouncementResponseDto, announcement, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const announcement = await this.announcementsService.update(
      +id,
      updateAnnouncementDto,
    );
    return plainToInstance(AnnouncementResponseDto, announcement, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  async replace(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const announcement = await this.announcementsService.update(
      +id,
      updateAnnouncementDto,
    );
    return plainToInstance(AnnouncementResponseDto, announcement, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(+id);
  }
}
