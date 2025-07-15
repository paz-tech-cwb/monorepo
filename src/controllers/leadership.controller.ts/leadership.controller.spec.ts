import { Test, TestingModule } from '@nestjs/testing';
import { LeadershipController } from './leadership.controller';

describe('LeadershipController', () => {
  let controller: LeadershipController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadershipController],
    }).compile();

    controller = module.get<LeadershipController>(LeadershipController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
