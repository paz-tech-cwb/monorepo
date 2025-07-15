import { Test, TestingModule } from '@nestjs/testing';
import { UsersCoursesService } from './users-courses.service';

describe('UsersCoursesService', () => {
  let service: UsersCoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersCoursesService],
    }).compile();

    service = module.get<UsersCoursesService>(UsersCoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
