import { BadRequestException, Injectable } from '@nestjs/common';
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

  findOne(id: number) {
    return `This action returns a #${id} announcement`;
  }

  update(id: number, updateAnnouncementDto: UpdateAnnouncementDto) {
    return `This action updates a #${id} announcement`;
  }

  remove(id: number) {
    return `This action removes a #${id} announcement`;
  }
}
