import { Test, TestingModule } from '@nestjs/testing';
import { WeekDayController } from './week-day.controller';

describe('WeekDayController', () => {
  let controller: WeekDayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeekDayController],
    }).compile();

    controller = module.get<WeekDayController>(WeekDayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
