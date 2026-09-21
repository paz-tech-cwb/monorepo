import { ForbiddenException } from '@nestjs/common';
import { CourseProgressService } from './course-progress.service';
import { CourseLesson } from './entities/course-lesson.entity';
import { CourseLessonProgress } from './entities/course-lesson-progress.entity';
import { CourseQuestion } from './entities/course-question.entity';
import { CourseQuestionOption } from './entities/course-question-option.entity';
import { CourseCertificate } from './entities/course-certificate.entity';
import { CourseQuestionnaire } from './entities/course-questionnaire.entity';

type EntityRef = new (...args: unknown[]) => unknown;

function buildJourneyProgressServiceMock() {
  return { syncCourseCompletion: jest.fn().mockResolvedValue(undefined) };
}

function buildManagerMock(overrides: Record<string, unknown> = {}) {
  const manager = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest
      .fn()
      .mockImplementation((entityOrValue: unknown, maybeValue?: unknown) => {
        // entityManager.save(entity) or entityManager.save(Entity, entity)
        return Promise.resolve(maybeValue ?? entityOrValue);
      }),
    create: jest
      .fn()
      .mockImplementation((_entity: unknown, value: unknown) => value),
    count: jest.fn().mockResolvedValue(0),
    query: jest.fn().mockResolvedValue(undefined),
    transaction: undefined as unknown,
    ...overrides,
  };
  // `transaction` runs the callback against this same mock manager, so
  // whatever `find`/`findOne`/`save`/`count` behavior a test configures also
  // applies inside the transactional submitQuestionnaire code path.
  manager.transaction = jest
    .fn()
    .mockImplementation((cb: (m: typeof manager) => unknown) => cb(manager));
  return manager;
}

describe('CourseProgressService - reportProgress', () => {
  it('never decreases max_watched_percentage (monotonic)', async () => {
    const lesson = { id: 'lesson-1', durationSeconds: 600 } as CourseLesson;
    const existingProgress = {
      userId: 1,
      lessonId: 'lesson-1',
      maxWatchedPercentage: 80,
      lastPositionSeconds: 400,
      completedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1h ago, plenty of real time
      updatedAt: new Date(Date.now() - 1000 * 60 * 60), // 1h ago, plenty of real time
    } as CourseLessonProgress;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lesson;
        if (entity === CourseLessonProgress) return existingProgress;
        return null;
      }),
    });

    const questionnairesService = {} as never;
    const memberJourneyService = {} as never;
    const service = new CourseProgressService(
      manager as never,
      questionnairesService,
      memberJourneyService,
    );

    const result = await service.reportProgress(1, 'lesson-1', {
      watched_percentage: 50, // lower than existing max
      position_seconds: 250,
    });

    expect(result.max_watched_percentage).toBe(80);
  });

  it('sets completed_at exactly once at the 90% crossing', async () => {
    const lesson = { id: 'lesson-1', durationSeconds: 600 } as CourseLesson;
    let progressState: CourseLessonProgress = {
      userId: 1,
      lessonId: 'lesson-1',
      maxWatchedPercentage: 80,
      lastPositionSeconds: 480,
      completedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60),
    } as CourseLessonProgress;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lesson;
        if (entity === CourseLessonProgress) return progressState;
        return null;
      }),
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: CourseLessonProgress) => {
          progressState = value;
          return value;
        }),
    });

    const service = new CourseProgressService(
      manager as never,
      {} as never,
      buildJourneyProgressServiceMock() as never,
    );

    const first = await service.reportProgress(1, 'lesson-1', {
      watched_percentage: 95,
      position_seconds: 570,
    });
    expect(first.completed).toBe(true);
    const firstCompletedAt = progressState.completedAt;
    expect(firstCompletedAt).not.toBeNull();

    // Reporting again at 100% must not change the original completed_at.
    const second = await service.reportProgress(1, 'lesson-1', {
      watched_percentage: 100,
      position_seconds: 600,
    });
    expect(second.completed).toBe(true);
    expect(progressState.completedAt).toBe(firstCompletedAt);
  });

  it('clamps an implausible checkpoint jump (anti-cheat)', async () => {
    const lesson = { id: 'lesson-1', durationSeconds: 600 } as CourseLesson;
    const existingProgress = {
      userId: 1,
      lessonId: 'lesson-1',
      maxWatchedPercentage: 10,
      lastPositionSeconds: 60,
      completedAt: null,
      createdAt: new Date(Date.now() - 2000), // only 2 real seconds ago
      updatedAt: new Date(Date.now() - 2000), // only 2 real seconds ago
    } as CourseLessonProgress;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lesson;
        if (entity === CourseLessonProgress) return existingProgress;
        return null;
      }),
    });

    const service = new CourseProgressService(
      manager as never,
      {} as never,
      {} as never,
    );

    // Claims a jump from 10% to 90% in ~2 real seconds on a 10-minute video —
    // physically impossible, must be clamped well below 90%.
    const result = await service.reportProgress(1, 'lesson-1', {
      watched_percentage: 90,
      position_seconds: 540,
    });

    expect(result.max_watched_percentage).toBeLessThan(90);
    expect(result.completed).toBe(false);
  });

  it('clamps the very first-ever checkpoint for a lesson (no prior row)', async () => {
    const lesson = { id: 'lesson-1', durationSeconds: 600 } as CourseLesson;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lesson;
        if (entity === CourseLessonProgress) return null; // no prior row
        return null;
      }),
    });

    const service = new CourseProgressService(
      manager as never,
      {} as never,
      {} as never,
    );

    // A single first-ever POST claiming 100% must NOT be trusted outright.
    const result = await service.reportProgress(1, 'lesson-1', {
      watched_percentage: 100,
      position_seconds: 600,
    });

    expect(result.max_watched_percentage).toBeLessThan(100);
    expect(result.completed).toBe(false);
  });

  it('clamps the very first-ever checkpoint to a conservative ceiling when duration is unknown', async () => {
    const lesson = { id: 'lesson-1', durationSeconds: null } as CourseLesson;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lesson;
        if (entity === CourseLessonProgress) return null;
        return null;
      }),
    });

    const service = new CourseProgressService(
      manager as never,
      {} as never,
      {} as never,
    );

    const result = await service.reportProgress(1, 'lesson-1', {
      watched_percentage: 100,
      position_seconds: 999,
    });

    expect(result.max_watched_percentage).toBeLessThanOrEqual(20);
  });

  it('does not let N rapid successive checkpoints exceed the time-plausible ceiling', async () => {
    const lesson = { id: 'lesson-1', durationSeconds: 600 } as CourseLesson;
    const createdAt = new Date(Date.now() - 3000); // 3 real seconds ago
    let progressState: CourseLessonProgress = {
      userId: 1,
      lessonId: 'lesson-1',
      maxWatchedPercentage: 0,
      lastPositionSeconds: 0,
      completedAt: null,
      createdAt,
      updatedAt: createdAt,
    } as CourseLessonProgress;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lesson;
        if (entity === CourseLessonProgress) return progressState;
        return null;
      }),
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: CourseLessonProgress) => {
          progressState = value;
          return value;
        }),
    });

    const service = new CourseProgressService(
      manager as never,
      {} as never,
      {} as never,
    );

    // 20 rapid-fire requests, each claiming a higher percentage, all within
    // the same ~3-second real-time window (the anchor, `createdAt`, never
    // moves, so the buffer can't be re-earned per call).
    let last:
      | { max_watched_percentage: number; completed: boolean }
      | undefined;
    for (let i = 0; i < 20; i++) {
      last = await service.reportProgress(1, 'lesson-1', {
        watched_percentage: 100,
        position_seconds: 600,
      });
    }

    // Time-plausible ceiling: elapsed(~3s)/duration(600s)*100*3x + 3pp buffer
    // is a low single-digit percentage — nowhere near 100%, regardless of
    // how many requests were fired.
    expect(last?.max_watched_percentage).toBeLessThan(10);
  });
});

describe('CourseProgressService - isQuestionnaireUnlocked', () => {
  it('is unlocked when the course has zero lessons', async () => {
    const manager = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return [];
        return [];
      }),
    });
    const service = new CourseProgressService(
      manager as never,
      {} as never,
      {} as never,
    );

    expect(await service.isQuestionnaireUnlocked(1, 'course-1')).toBe(true);
  });

  it('is unlocked only when every lesson has >=90% progress', async () => {
    const lessons = [
      { id: 'l1', courseId: 'course-1' },
      { id: 'l2', courseId: 'course-1' },
    ];
    const partialProgress = [
      { lessonId: 'l1', maxWatchedPercentage: 95 },
      { lessonId: 'l2', maxWatchedPercentage: 40 },
    ];

    const manager = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lessons;
        if (entity === CourseLessonProgress) return partialProgress;
        return [];
      }),
    });
    const service = new CourseProgressService(
      manager as never,
      {} as never,
      {} as never,
    );

    expect(await service.isQuestionnaireUnlocked(1, 'course-1')).toBe(false);

    const manager2 = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lessons;
        if (entity === CourseLessonProgress)
          return [
            { lessonId: 'l1', maxWatchedPercentage: 95 },
            { lessonId: 'l2', maxWatchedPercentage: 91 },
          ];
        return [];
      }),
    });
    const service2 = new CourseProgressService(
      manager2 as never,
      {} as never,
      {} as never,
    );
    expect(await service2.isQuestionnaireUnlocked(1, 'course-1')).toBe(true);
  });
});

describe('CourseProgressService - submitQuestionnaire', () => {
  function buildQuestionnaireFixture() {
    const questionnaire = {
      id: 'questionnaire-1',
      courseId: 'course-1',
      passingScorePercentage: 70,
      maxAttempts: null,
    };
    const questions = [
      { id: 'q1', type: 'single_choice', points: 1 },
      { id: 'q2', type: 'multiple_choice', points: 2 },
      { id: 'q3', type: 'free_text', points: 1 },
    ];
    const options = [
      { id: 'o1', questionId: 'q1', isCorrect: true },
      { id: 'o2', questionId: 'q1', isCorrect: false },
      { id: 'o3', questionId: 'q2', isCorrect: true },
      { id: 'o4', questionId: 'q2', isCorrect: true },
      { id: 'o5', questionId: 'q2', isCorrect: false },
    ];
    return { questionnaire, questions, options };
  }

  it('rejects with 403 COURSE_NOT_WATCHED when the gate is unmet', async () => {
    const lessons = [{ id: 'l1', courseId: 'course-1' }];
    const manager = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lessons;
        if (entity === CourseLessonProgress)
          return [{ lessonId: 'l1', maxWatchedPercentage: 10 }];
        return [];
      }),
    });

    const service = new CourseProgressService(
      manager as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.submitQuestionnaire(1, 'course-1', []),
    ).rejects.toThrow(ForbiddenException);
  });

  it('scores single/multiple choice correctly and excludes free_text from the denominator', async () => {
    const { questionnaire, questions, options } = buildQuestionnaireFixture();

    const manager = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return []; // zero-lesson course -> unlocked
        if (entity === CourseQuestion) return questions;
        if (entity === CourseQuestionOption) return options;
        return [];
      }),
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseCertificate) return null;
        return null;
      }),
    });

    const questionnairesService = {
      findEntityForCourseOrThrow: jest.fn().mockResolvedValue(questionnaire),
      countAttempts: jest.fn().mockResolvedValue(0),
    };
    const journeyProgressService = buildJourneyProgressServiceMock();

    const service = new CourseProgressService(
      manager as never,
      questionnairesService as never,
      journeyProgressService as never,
    );

    // q1 correct (o1), q2 fully correct (o3+o4), q3 free_text ignored.
    const result = await service.submitQuestionnaire(1, 'course-1', [
      { question_id: 'q1', option_ids: ['o1'] },
      { question_id: 'q2', option_ids: ['o3', 'o4'] },
      { question_id: 'q3', text: 'free response' },
    ] as never);

    expect(result.score_percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(journeyProgressService.syncCourseCompletion).toHaveBeenCalledWith(
      1,
      'course-1',
    );
  });

  it('issues a certificate exactly once across repeated passes', async () => {
    const { questionnaire, questions, options } = buildQuestionnaireFixture();
    let certificate: CourseCertificate | null = null;

    const manager = buildManagerMock({
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return [];
        if (entity === CourseQuestion) return questions;
        if (entity === CourseQuestionOption) return options;
        return [];
      }),
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseCertificate) return certificate;
        return null;
      }),
      save: jest
        .fn()
        .mockImplementation((entityOrValue: unknown, maybeValue?: unknown) => {
          const value = maybeValue ?? entityOrValue;
          if (value && 'certificateCode' in value) {
            certificate = { ...value, id: 'cert-1' };
            return certificate;
          }
          return value;
        }),
    });

    const questionnairesService = {
      findEntityForCourseOrThrow: jest.fn().mockResolvedValue(questionnaire),
      countAttempts: jest.fn().mockResolvedValue(0),
    };
    const journeyProgressService = buildJourneyProgressServiceMock();

    const service = new CourseProgressService(
      manager as never,
      questionnairesService as never,
      journeyProgressService as never,
    );

    const answers = [
      { question_id: 'q1', option_ids: ['o1'] },
      { question_id: 'q2', option_ids: ['o3', 'o4'] },
    ] as never;

    const firstPass = await service.submitQuestionnaire(1, 'course-1', answers);
    const secondPass = await service.submitQuestionnaire(
      1,
      'course-1',
      answers,
    );

    expect(firstPass.certificate).not.toBeNull();
    expect(secondPass.certificate).not.toBeNull();
    expect(firstPass.certificate?.certificate_code).toBe(
      secondPass.certificate?.certificate_code,
    );
  });
});

describe('CourseProgressService - questionnaire-less course completion sync', () => {
  it('triggers journeyProgressService.syncCourseCompletion exactly once when the final lesson crosses the watch threshold', async () => {
    const lessonL1 = { id: 'l1', courseId: 'course-1', durationSeconds: null };
    const lessonL2 = { id: 'l2', courseId: 'course-1', durationSeconds: null };
    const existingProgressL2 = {
      userId: 1,
      lessonId: 'l2',
      maxWatchedPercentage: 50,
      lastPositionSeconds: 100,
      completedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60),
    } as CourseLessonProgress;
    const otherLessonProgress = [{ lessonId: 'l1', maxWatchedPercentage: 95 }];

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lessonL2;
        if (entity === CourseLessonProgress) return existingProgressL2;
        if (entity === CourseQuestionnaire) return null; // questionnaire-less course
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return [lessonL1, lessonL2];
        if (entity === CourseLessonProgress) return otherLessonProgress;
        return [];
      }),
    });

    const journeyProgressService = buildJourneyProgressServiceMock();
    const service = new CourseProgressService(
      manager as never,
      {} as never,
      journeyProgressService as never,
    );

    const result = await service.reportProgress(1, 'l2', {
      watched_percentage: 95,
      position_seconds: 190,
    });

    expect(result.completed).toBe(true);
    expect(journeyProgressService.syncCourseCompletion).toHaveBeenCalledTimes(
      1,
    );
    expect(journeyProgressService.syncCourseCompletion).toHaveBeenCalledWith(
      1,
      'course-1',
    );
  });

  it('does not trigger sync on an ordinary mid-course progress ping', async () => {
    const lesson = { id: 'l1', courseId: 'course-1', durationSeconds: null };
    const existingProgress = {
      userId: 1,
      lessonId: 'l1',
      maxWatchedPercentage: 10,
      lastPositionSeconds: 20,
      completedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60),
    } as CourseLessonProgress;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lesson;
        if (entity === CourseLessonProgress) return existingProgress;
        return null;
      }),
    });

    const journeyProgressService = buildJourneyProgressServiceMock();
    const service = new CourseProgressService(
      manager as never,
      {} as never,
      journeyProgressService as never,
    );

    const result = await service.reportProgress(1, 'l1', {
      watched_percentage: 50,
      position_seconds: 100,
    });

    expect(result.completed).toBe(false);
    expect(journeyProgressService.syncCourseCompletion).not.toHaveBeenCalled();
  });

  it('does not trigger sync when the course still has a questionnaire (handled via submitQuestionnaire instead)', async () => {
    const lessonL1 = { id: 'l1', courseId: 'course-1', durationSeconds: null };
    const lessonL2 = { id: 'l2', courseId: 'course-1', durationSeconds: null };
    const existingProgressL2 = {
      userId: 1,
      lessonId: 'l2',
      maxWatchedPercentage: 50,
      lastPositionSeconds: 100,
      completedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60),
    } as CourseLessonProgress;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return lessonL2;
        if (entity === CourseLessonProgress) return existingProgressL2;
        if (entity === CourseQuestionnaire) return { id: 'q-1' }; // has a questionnaire
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === CourseLesson) return [lessonL1, lessonL2];
        return [{ lessonId: 'l1', maxWatchedPercentage: 95 }];
      }),
    });

    const journeyProgressService = buildJourneyProgressServiceMock();
    const service = new CourseProgressService(
      manager as never,
      {} as never,
      journeyProgressService as never,
    );

    await service.reportProgress(1, 'l2', {
      watched_percentage: 95,
      position_seconds: 190,
    });

    expect(journeyProgressService.syncCourseCompletion).not.toHaveBeenCalled();
  });
});
