import { Test, TestingModule } from '@nestjs/testing';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { ContributionsService } from 'src/contributions/contributions.service';
import { EventsService } from 'src/events/events.service';

describe('HomeController', () => {
  let controller: HomeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [
        HomeService,
        { provide: AnnouncementsService, useValue: { findAll: jest.fn() } },
        { provide: ContributionsService, useValue: { findAll: jest.fn() } },
        { provide: EventsService, useValue: { findAll: jest.fn() } },
      ],
    }).compile();

    controller = module.get<HomeController>(HomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
