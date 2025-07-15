import { Test, TestingModule } from '@nestjs/testing';
import { UsersCoursesController } from './users-courses.controller';

describe('UsersCoursesController', () => {
  let controller: UsersCoursesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersCoursesController],
    }).compile();

    controller = module.get<UsersCoursesController>(UsersCoursesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
