import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
