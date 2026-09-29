import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CasaDePazLessonsService } from './casa-de-paz-lessons.service';
import { CasaDePazLesson } from './entities/casa-de-paz-lesson.entity';
import { CasaDePazLessonsController } from './casa-de-paz-lessons.controller';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { LEADERSHIP_ROLES } from '../common/constants/leadership-roles';

describe('CasaDePazLessonsService', () => {
  let service: CasaDePazLessonsService;
  let repo: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((x: CasaDePazLesson) => x),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasaDePazLessonsService,
        { provide: getRepositoryToken(CasaDePazLesson), useValue: repo },
      ],
    }).compile();
    service = module.get(CasaDePazLessonsService);
  });

  it('lists all 4 rows ordered by week', async () => {
    repo.find.mockResolvedValue([
      {
        week: 1,
        title: 'S1',
        summary: '',
        guidelines: '',
        questions: [],
        youtubeUrl: null,
      },
      {
        week: 2,
        title: 'S2',
        summary: '',
        guidelines: '',
        questions: [],
        youtubeUrl: null,
      },
      {
        week: 3,
        title: 'S3',
        summary: '',
        guidelines: '',
        questions: [],
        youtubeUrl: null,
      },
      {
        week: 4,
        title: 'S4',
        summary: '',
        guidelines: '',
        questions: [],
        youtubeUrl: null,
      },
    ]);

    const result = await service.list();

    expect(repo.find).toHaveBeenCalledWith({ order: { week: 'ASC' } });
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.week)).toEqual([1, 2, 3, 4]);
  });

  it('applies only the provided fields on update, leaving others untouched', async () => {
    const entity = {
      week: 2,
      title: 'Original title',
      summary: 'Original summary',
      guidelines: 'Original guidelines',
      questions: ['q1'],
      youtubeUrl: null,
    };
    repo.findOne.mockResolvedValue(entity);

    const result = await service.update(2, { title: 'Updated title' });

    expect(entity.summary).toBe('Original summary');
    expect(entity.guidelines).toBe('Original guidelines');
    expect(entity.questions).toEqual(['q1']);
    expect(result.title).toBe('Updated title');
  });

  it('throws NotFoundException when updating an unknown week', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.update(9, { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('round-trips questions as an ordered array', async () => {
    const entity = {
      week: 3,
      title: 'S3',
      summary: '',
      guidelines: '',
      questions: [],
      youtubeUrl: null,
    };
    repo.findOne.mockResolvedValue(entity);

    const result = await service.update(3, {
      questions: ['first', 'second', 'third'],
    });

    expect(result.questions).toEqual(['first', 'second', 'third']);
  });
});

describe('CasaDePazLessonsController roles metadata', () => {
  // Guard against someone loosening the unusual leadership-gated GET later:
  // this endpoint intentionally requires leadership roles for reads too,
  // not just writes.
  const reflector = new Reflector();

  it('requires LEADERSHIP_ROLES on the list (GET) handler', () => {
    const roles = reflector.get<string[]>(
      ROLES_KEY,
      CasaDePazLessonsController.prototype['list'],
    );
    expect(roles).toEqual([...LEADERSHIP_ROLES]);
  });

  it('requires LEADERSHIP_ROLES on the update (PATCH) handler', () => {
    const roles = reflector.get<string[]>(
      ROLES_KEY,
      CasaDePazLessonsController.prototype['update'],
    );
    expect(roles).toEqual([...LEADERSHIP_ROLES]);
  });
});
