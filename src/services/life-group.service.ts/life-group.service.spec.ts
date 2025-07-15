import { Test, TestingModule } from '@nestjs/testing';
import { LifeGroupService } from './life-group.service';

describe('LifeGroupService', () => {
  let service: LifeGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LifeGroupService],
    }).compile();

    service = module.get<LifeGroupService>(LifeGroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
