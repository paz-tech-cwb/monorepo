import { Test, TestingModule } from '@nestjs/testing';
import { LeadershipService } from './leadership.service';

describe('LeadershipService', () => {
  let service: LeadershipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadershipService],
    }).compile();

    service = module.get<LeadershipService>(LeadershipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
