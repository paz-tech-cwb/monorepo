import { Injectable } from '@nestjs/common';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { Announcement } from 'src/announcements/entities/announcement.entity';

@Injectable()
export class HomeService {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  async getHomeContent() {
    const announcementsList: Announcement[] =
      await this.announcementsService.findAll();

    announcementsList.forEach((element) => console.log(element.id));

    const sectionsReturn = {
      sections: [
        {
          type: 'announcements',
          items: announcementsList,
		  order: 1
        },
        {
          type: 'contribution',
          items: '',
		  order: 2
        },
        {
          type: 'agenda',
          items: '',
		  order: 3
        },
      ],
    };
    return sectionsReturn;
  }
}
