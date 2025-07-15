import { Test, TestingModule } from '@nestjs/testing';
import { WeekDayService } from './week-day.service';

describe('WeekDayService', () => {
  let service: WeekDayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeekDayService],
    }).compile();

    service = module.get<WeekDayService>(WeekDayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
