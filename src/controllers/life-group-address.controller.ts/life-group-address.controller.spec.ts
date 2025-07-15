import { Test, TestingModule } from '@nestjs/testing';
import { LifeGroupAddressController } from './life-group-address.controller';

describe('LifeGroupAddressController', () => {
  let controller: LifeGroupAddressController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifeGroupAddressController],
    }).compile();

    controller = module.get<LifeGroupAddressController>(LifeGroupAddressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
