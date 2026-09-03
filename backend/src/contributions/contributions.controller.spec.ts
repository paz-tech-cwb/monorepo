import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';

describe('ContributionsController', () => {
  let controller: ContributionsController;

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributionsController],
      providers: [
        ContributionsService,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    controller = module.get<ContributionsController>(ContributionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
