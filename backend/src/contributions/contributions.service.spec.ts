import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { ContributionsService } from './contributions.service';

describe('ContributionsService', () => {
  let service: ContributionsService;

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
        ContributionsService,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<ContributionsService>(ContributionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
