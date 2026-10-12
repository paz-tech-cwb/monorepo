import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';
import { plainToInstance } from 'class-transformer';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { User } from '../users/entities/user.entity';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(...LEADERSHIP_ROLES)
  create(
    @Request() req: { user: User },
    @Body() createAnnouncementDto: CreateAnnouncementDto,
  ): Promise<void> {
    if (!req.user.churchId) {
      throw new BadRequestException(
        'User has no associated church; cannot create an announcement.',
      );
    }
    return this.announcementsService.create(
      createAnnouncementDto,
      req.user.churchId,
    );
  }

  @Get()
  async findAll(
    @Request() req: { user: User },
  ): Promise<AnnouncementResponseDto[]> {
    const announcements = await this.announcementsService.findAll(
      req.user.churchId ?? undefined,
    );
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
  @Roles(...LEADERSHIP_ROLES)
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
  @Roles(...LEADERSHIP_ROLES)
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
  @Roles(...LEADERSHIP_ROLES)
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(+id);
  }
}
