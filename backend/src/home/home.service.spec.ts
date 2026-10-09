import { Test, TestingModule } from '@nestjs/testing';
import { HomeService } from './home.service';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { ContributionsService } from 'src/contributions/contributions.service';
import { EventsService } from 'src/events/events.service';

describe('HomeService', () => {
  let service: HomeService;
  let eventsService: { findUpcomingWithinDays: jest.Mock };
  let announcementsService: { findAll: jest.Mock };
  let contributionsService: { findAll: jest.Mock };

  beforeEach(async () => {
    eventsService = {
      findUpcomingWithinDays: jest.fn().mockResolvedValue([]),
    };
    announcementsService = { findAll: jest.fn().mockResolvedValue([]) };
    contributionsService = { findAll: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeService,
        { provide: AnnouncementsService, useValue: announcementsService },
        { provide: ContributionsService, useValue: contributionsService },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get<HomeService>(HomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('builds the agenda section from EventsService.findUpcomingWithinDays, using a 7-day window rather than a fixed count', async () => {
    const upcomingOccurrences = [
      {
        id: 1,
        title: 'Culto semanal',
        initial_date: new Date('2026-10-12T19:00:00Z'),
        final_date: null,
        description: null,
        recurrence_type: 'WEEKLY',
        image_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    eventsService.findUpcomingWithinDays.mockResolvedValue(
      upcomingOccurrences,
    );

    const result = await service.getHomeContent();

    // The home agenda must be date-window-bound (next 7 days), not count-bound —
    // a fixed count can be exhausted by recurring events before day 7 is reached,
    // silently dropping days from the agenda.
    expect(eventsService.findUpcomingWithinDays).toHaveBeenCalledWith(7);

    const agendaSection = result.sections.find((s) => s.type === 'agenda');
    expect(agendaSection).toBeDefined();
    expect(agendaSection?.items).toEqual(upcomingOccurrences);
  });

  it('keeps announcements and contributions sections intact', async () => {
    announcementsService.findAll.mockResolvedValue([{ id: 1 }]);
    contributionsService.findAll.mockResolvedValue([{ id: 2 }]);

    const result = await service.getHomeContent();

    const announcementsSection = result.sections.find(
      (s) => s.type === 'announcements',
    );
    const contributionSection = result.sections.find(
      (s) => s.type === 'contribution',
    );

    expect(announcementsSection?.items).toEqual([{ id: 1 }]);
    expect(contributionSection?.items).toEqual([{ id: 2 }]);
  });
});
