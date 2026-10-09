import { Injectable } from '@nestjs/common';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { Announcement } from 'src/announcements/entities/announcement.entity';
import { Contribution } from 'src/contributions/entities/contribution.entity';
import { ContributionsService } from 'src/contributions/contributions.service';
import { EventsService } from 'src/events/events.service';

/** Matches the mobile clients' "next 7 days" home agenda window. */
const HOME_AGENDA_WINDOW_DAYS = 7;

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

    const eventsList = await this.eventsService.findUpcomingWithinDays(
      HOME_AGENDA_WINDOW_DAYS,
    );

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
