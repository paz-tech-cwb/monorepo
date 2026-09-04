import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Announcement } from './entities/announcement.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * This action adds a new announcement.
   * @param createAnnouncementDto
   */
  async create(createAnnouncementDto: CreateAnnouncementDto): Promise<void> {
    const { imageUrl, title, subtitle, markdownContent, actionUrl } =
      createAnnouncementDto;

    try {
      const announcement = this.entityManager.create(Announcement, {
        imageUrl,
        title,
        subtitle,
        markdownContent,
        actionUrl,
      });

      await this.entityManager.save(announcement);
    } catch (error) {
      console.log('Error: ', error);
      throw new BadRequestException(
        'An error occurred while inserting the announcement.',
      );
    }
  }

  /**
   * This action returns all announcements.
   * @returns
   */
  async findAll(): Promise<Announcement[]> {
    try {
      return await this.entityManager.find(Announcement);
    } catch (error) {
      console.log('Error: ', error);
      throw new BadRequestException(
        'An error occurred while finding all announcements.',
      );
    }
  }

  async findOne(id: number): Promise<Announcement> {
    try {
      const announcement = await this.entityManager.findOne(Announcement, {
        where: { id },
      });

      if (!announcement) {
        throw new NotFoundException(`Announcement with ID ${id} not found`);
      }

      return announcement;
    } catch {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }
  }

  async update(
    id: number,
    updateAnnouncementDto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    try {
      const announcement = await this.findOne(id);

      // merge new values
      Object.assign(announcement, updateAnnouncementDto);

      // save changes
      return await this.entityManager.save(Announcement, announcement);
    } catch {
      throw new NotFoundException(
        `It was not possible to update the Announcement.`,
      );
    }
  }

  async remove(id: number): Promise<void> {
    const announcement = await this.findOne(id);
    await this.entityManager.remove(Announcement, announcement);
  }
}
