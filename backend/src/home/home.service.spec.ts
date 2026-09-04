import { Test, TestingModule } from '@nestjs/testing';
import { HomeService } from './home.service';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { ContributionsService } from 'src/contributions/contributions.service';
import { EventsService } from 'src/events/events.service';

describe('HomeService', () => {
  let service: HomeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeService,
        { provide: AnnouncementsService, useValue: { findAll: jest.fn() } },
        { provide: ContributionsService, useValue: { findAll: jest.fn() } },
        { provide: EventsService, useValue: { findAll: jest.fn() } },
      ],
    }).compile();

    service = module.get<HomeService>(HomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
