import { Test, TestingModule } from '@nestjs/testing';
import { CoursesClassesController } from './courses-classes.controller';

describe('CoursesClassesController', () => {
  let controller: CoursesClassesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesClassesController],
    }).compile();

    controller = module.get<CoursesClassesController>(CoursesClassesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
