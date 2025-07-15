import { Test, TestingModule } from '@nestjs/testing';
import { LifeGroupAddressService } from './life-group-address.service';

describe('LifeGroupAddressService', () => {
  let service: LifeGroupAddressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LifeGroupAddressService],
    }).compile();

    service = module.get<LifeGroupAddressService>(LifeGroupAddressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
