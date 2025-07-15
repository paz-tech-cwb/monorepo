import { Test, TestingModule } from '@nestjs/testing';
import { LifeGroupController } from './life-group.controller';

describe('LifeGroupController', () => {
  let controller: LifeGroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifeGroupController],
    }).compile();

    controller = module.get<LifeGroupController>(LifeGroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
