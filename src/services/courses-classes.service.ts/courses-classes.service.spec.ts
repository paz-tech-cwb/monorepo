import { Test, TestingModule } from '@nestjs/testing';
import { CoursesClassesService } from './courses-classes.service';

describe('CoursesClassesService', () => {
  let service: CoursesClassesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursesClassesService],
    }).compile();

    service = module.get<CoursesClassesService>(CoursesClassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
