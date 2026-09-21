import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { CourseTrack } from './entities/course-track.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseLesson } from './entities/course-lesson.entity';
import { CourseLessonProgress } from './entities/course-lesson-progress.entity';
import { CourseCertificate } from './entities/course-certificate.entity';
import { CourseQuestionnaire } from './entities/course-questionnaire.entity';
import { CourseQuestion } from './entities/course-question.entity';
import { CourseQuestionnaireResponse } from './entities/course-questionnaire-response.entity';
import { CourseLessonsService } from './course-lessons.service';
import { CourseProgressService } from './course-progress.service';
import { REQUIRED_WATCH_PERCENTAGE } from './constants';

@Injectable()
export class AcademyService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly courseLessonsService: CourseLessonsService,
    private readonly courseProgressService: CourseProgressService,
  ) {}

  async getAcademy(userId: number) {
    try {
      const tracks = await this.entityManager.find(CourseTrack, {
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });

      const allCourseIds = new Set<string>();
      for (const track of tracks) {
        for (const course of track.courses || []) {
          allCourseIds.add(course.id);
        }
      }
      const courseIds = [...allCourseIds];

      // Batched: 1 query for lesson counts, 1 for user progress, 1 for user
      // certificates — never N+1 per course.
      const lessons = courseIds.length
        ? await this.entityManager.find(CourseLesson, {
            where: { courseId: In(courseIds) },
          })
        : [];
      const lessonCountByCourse = new Map<string, number>();
      for (const lesson of lessons) {
        lessonCountByCourse.set(
          lesson.courseId,
          (lessonCountByCourse.get(lesson.courseId) ?? 0) + 1,
        );
      }

      const lessonIds = lessons.map((l) => l.id);
      const progresses = lessonIds.length
        ? await this.entityManager.find(CourseLessonProgress, {
            where: { userId, lessonId: In(lessonIds) },
          })
        : [];
      const progressByLesson = new Map(
        progresses.map((p) => [p.lessonId, p.maxWatchedPercentage]),
      );

      const certificates = courseIds.length
        ? await this.entityManager.find(CourseCertificate, {
            where: { userId, courseId: In(courseIds) },
          })
        : [];
      const certifiedCourseIds = new Set(certificates.map((c) => c.courseId));

      const courseFields = (course: Course) => {
        const courseLessons = lessons.filter((l) => l.courseId === course.id);
        const lessonCount = lessonCountByCourse.get(course.id) ?? 0;
        const watchedSum = courseLessons.reduce(
          (sum, l) => sum + (progressByLesson.get(l.id) ?? 0),
          0,
        );
        const progressPercentage =
          lessonCount > 0 ? Math.round(watchedSum / lessonCount) : 0;
        const completed =
          lessonCount > 0 &&
          courseLessons.every(
            (l) =>
              (progressByLesson.get(l.id) ?? 0) >= REQUIRED_WATCH_PERCENTAGE,
          );

        return {
          id: course.id,
          title: course.title,
          description: course.description ?? null,
          thumbnail_url: course.thumbnailUrl ?? null,
          url: course.url ?? null,
          lesson_count: lessonCount,
          completed,
          progress_percentage: progressPercentage,
          has_certificate: certifiedCourseIds.has(course.id),
        };
      };

      return {
        tracks: tracks.map((track) => ({
          id: track.id,
          title: track.title,
          description: track.description ?? null,
          sort_order: track.sortOrder,
          completed: (track.courses || []).every((c) =>
            certifiedCourseIds.has(c.id),
          ),
          courses: (track.courses || []).map((c) => courseFields(c)),
        })),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'An error occurred while retrieving academy data.',
      );
    }
  }

  async getCourseDetail(userId: number, courseId: string) {
    const course = await this.entityManager.findOne(Course, {
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const lessons = await this.courseLessonsService.findAllForCourse(courseId);
    const progresses = await this.entityManager.find(CourseLessonProgress, {
      where: {
        userId,
        lessonId: In(lessons.map((l) => l.id)),
      },
    });
    const progressByLesson = new Map(progresses.map((p) => [p.lessonId, p]));

    const lessonsWithProgress = lessons.map((lesson) => {
      const progress = progressByLesson.get(lesson.id);
      return {
        ...lesson,
        my_progress: progress
          ? {
              max_watched_percentage: progress.maxWatchedPercentage,
              last_position_seconds: progress.lastPositionSeconds,
              completed: progress.completedAt !== null,
            }
          : {
              max_watched_percentage: 0,
              last_position_seconds: 0,
              completed: false,
            },
      };
    });

    const questionnaire = await this.entityManager.findOne(
      CourseQuestionnaire,
      { where: { courseId } },
    );

    let questionnaireSummary: unknown = null;
    if (questionnaire) {
      const questionCount = await this.entityManager.count(CourseQuestion, {
        where: { questionnaireId: questionnaire.id },
      });
      const attemptsUsed = await this.entityManager.count(
        CourseQuestionnaireResponse,
        { where: { userId, questionnaireId: questionnaire.id } },
      );
      questionnaireSummary = {
        id: questionnaire.id,
        title: questionnaire.title,
        question_count: questionCount,
        passing_score_percentage: questionnaire.passingScorePercentage,
        attempts_used: attemptsUsed,
      };
    }

    const questionnaireUnlocked =
      await this.courseProgressService.isQuestionnaireUnlocked(
        userId,
        courseId,
      );

    const certificate = await this.entityManager.findOne(CourseCertificate, {
      where: { userId, courseId },
    });

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail_url: course.thumbnailUrl ?? null,
      url: course.url ?? null,
      lessons: lessonsWithProgress,
      questionnaire: questionnaireSummary,
      questionnaire_unlocked: questionnaireUnlocked,
      certificate: certificate
        ? {
            id: certificate.id,
            certificate_code: certificate.certificateCode,
            issued_at: certificate.issuedAt,
            score_percentage: certificate.scorePercentage,
          }
        : null,
    };
  }
}
