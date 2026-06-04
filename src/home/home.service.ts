import { Injectable } from '@nestjs/common';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { Announcement } from 'src/announcements/entities/announcement.entity';
import { Contribution } from 'src/contributions/entities/contribution.entity';
import { ContributionsService } from 'src/contributions/contributions.service';
import { EventsService } from 'src/events/events.service';
import { Event } from 'src/events/entities/event.entity';

@Injectable()
export class HomeService {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly contributionsService: ContributionsService,
    private readonly eventsService: EventsService,
  ) {}

  async getHomeContent() {
    const announcementsList: Announcement[] =
      await this.announcementsService.findAll();

    const contributionsList: Contribution[] =
      await this.contributionsService.findAll();

    const eventsList: Event[] = await this.eventsService.findAll();

    return {
      sections: [
        {
          type: 'announcements',
          items: announcementsList,
          order: 1,
        },
        {
          type: 'agenda',
          items: eventsList,
          order: 2,
        },
        {
          type: 'contribution',
          items: contributionsList,
          order: 3,
        },
      ],
    };
  }
}
