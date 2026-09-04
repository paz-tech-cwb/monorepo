import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormCourse } from './entities/form-course.entity';
import { FormCourseLink } from './entities/form-course-link.entity';
import { FormCoursesService } from './form-courses.service';

type MockRepo<T> = { [K in keyof Repository<T>]?: jest.Mock };

describe('FormCoursesService', () => {
  let service: FormCoursesService;
  let coursesRepo: MockRepo<FormCourse>;
  let linksRepo: MockRepo<FormCourseLink>;

  beforeEach(async () => {
    coursesRepo = {
      save: jest.fn(),
      create: jest.fn((x: Partial<FormCourse>) => x),
      findBy: jest.fn(),
      findOneBy: jest.fn(),
    };
    linksRepo = {
      find: jest.fn().mockResolvedValue([]),
      insert: jest.fn(),
      delete: jest.fn(),
      maximum: jest.fn().mockResolvedValue(0),
    };
    const m = await Test.createTestingModule({
      providers: [
        FormCoursesService,
        { provide: getRepositoryToken(FormCourse), useValue: coursesRepo },
        { provide: getRepositoryToken(FormCourseLink), useValue: linksRepo },
      ],
    }).compile();
    service = m.get(FormCoursesService);
  });

  it('createAndLink saves a course and links it to the form', async () => {
    coursesRepo.save.mockResolvedValue({
      id: 'c1',
      name: 'Nova Criatura',
      isActive: true,
    });
    await service.createAndLink('member-registrations', {
      name: 'Nova Criatura',
    } as any);
    expect(linksRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: 'member-registrations',
        courseId: 'c1',
      }),
    );
  });
});
