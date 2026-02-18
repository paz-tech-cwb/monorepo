import { Injectable } from '@nestjs/common';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { Announcement } from 'src/announcements/entities/announcement.entity';
import { Contribution } from 'src/contributions/entities/contribution.entity';
import { ContributionsService } from 'src/contributions/contributions.service';

@Injectable()
export class HomeService {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly contributionsService: ContributionsService,
  ) {}

  async getHomeContent() {
    const announcementsList: Announcement[] =
      await this.announcementsService.findAll();

    const contributionsList: Contribution[] =
      await this.contributionsService.findAll();

    // announcementsList.forEach((element) => console.log(element.id));

    const sectionsReturn = {
      sections: [
        {
          type: 'announcements',
          items: announcementsList,
          order: 1,
        },
        {
          type: 'contribution',
          items: contributionsList,
          order: 2,
        },
        {
          type: 'agenda',
          items: '',
          order: 3,
        },
      ],
    };
    return sectionsReturn;
  }
}
