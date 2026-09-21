import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { CourseLesson } from './entities/course-lesson.entity';
import { CourseLessonProgress } from './entities/course-lesson-progress.entity';
import { CourseQuestion } from './entities/course-question.entity';
import { CourseQuestionOption } from './entities/course-question-option.entity';
import {
  CourseQuestionnaireAnswer,
  CourseQuestionnaireResponse,
} from './entities/course-questionnaire-response.entity';
import { CourseCertificate } from './entities/course-certificate.entity';
import { CourseTrackCourse } from './entities/course-track-course.entity';
import { CourseTrack } from './entities/course-track.entity';
import { ReportLessonProgressDto } from './dto/report-lesson-progress.dto';
import { QuestionnaireAnswerDto } from './dto/submit-questionnaire.dto';
import { CourseQuestionnairesService } from './course-questionnaires.service';
import { MemberJourneyService } from '../member-journey/member-journey.service';
import { REQUIRED_WATCH_PERCENTAGE } from './constants';

const CERTIFICATE_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // RFC 4648 base32
const CERTIFICATE_CODE_LENGTH = 12;

// A generous playback-speed tolerance: normal watch is elapsed*1.0. Fast
// scrubbing/seeking is legitimate, so we allow up to 3x + a fixed buffer to
// avoid false positives from timer jitter, while still catching an obviously
// impossible jump (e.g. 10% -> 90% in 2 real seconds).
const ANTI_CHEAT_SPEED_MULTIPLIER = 3;
const ANTI_CHEAT_BUFFER_PERCENTAGE = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function generateCertificateCode(): string {
  const bytes = crypto.randomBytes(CERTIFICATE_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CERTIFICATE_CODE_LENGTH; i++) {
    code +=
      CERTIFICATE_CODE_ALPHABET[bytes[i] % CERTIFICATE_CODE_ALPHABET.length];
  }
  return code;
}

@Injectable()
export class CourseProgressService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly courseQuestionnairesService: CourseQuestionnairesService,
    private readonly memberJourneyService: MemberJourneyService,
  ) {}

  async reportProgress(
    userId: number,
    lessonId: string,
    dto: ReportLessonProgressDto,
  ) {
    const lesson = await this.entityManager.findOne(CourseLesson, {
      where: { id: lessonId },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    let progress = await this.entityManager.findOne(CourseLessonProgress, {
      where: { userId, lessonId },
    });

    const requestedPercentage = clamp(dto.watched_percentage, 0, 100);

    if (!progress) {
      progress = this.entityManager.create(CourseLessonProgress, {
        userId,
        lessonId,
        maxWatchedPercentage: 0,
        lastPositionSeconds: 0,
        completedAt: null,
      });
    } else {
      const elapsedSeconds = Math.max(
        0,
        (Date.now() - progress.updatedAt.getTime()) / 1000,
      );
      const delta = requestedPercentage - progress.maxWatchedPercentage;

      if (delta > 0 && lesson.durationSeconds && lesson.durationSeconds > 0) {
        const maxPlausibleDelta =
          (elapsedSeconds / lesson.durationSeconds) *
            100 *
            ANTI_CHEAT_SPEED_MULTIPLIER +
          ANTI_CHEAT_BUFFER_PERCENTAGE;

        if (delta > maxPlausibleDelta) {
          const clampedPercentage = clamp(
            progress.maxWatchedPercentage + maxPlausibleDelta,
            0,
            100,
          );
          return this.applyProgress(progress, clampedPercentage, dto);
        }
      }
    }

    return this.applyProgress(progress, requestedPercentage, dto);
  }

  private async applyProgress(
    progress: CourseLessonProgress,
    requestedPercentage: number,
    dto: ReportLessonProgressDto,
  ) {
    progress.maxWatchedPercentage = Math.max(
      progress.maxWatchedPercentage,
      requestedPercentage,
    );
    progress.lastPositionSeconds = Math.max(0, dto.position_seconds);

    if (
      !progress.completedAt &&
      progress.maxWatchedPercentage >= REQUIRED_WATCH_PERCENTAGE
    ) {
      progress.completedAt = new Date();
    }

    const saved = await this.entityManager.save(CourseLessonProgress, progress);

    return {
      max_watched_percentage: saved.maxWatchedPercentage,
      completed: saved.completedAt !== null,
    };
  }

  async getProgressForUserAndCourse(userId: number, courseId: string) {
    const lessons = await this.entityManager.find(CourseLesson, {
      where: { courseId },
    });
    if (lessons.length === 0) return [];

    return this.entityManager.find(CourseLessonProgress, {
      where: { userId, lessonId: In(lessons.map((l) => l.id)) },
    });
  }

  async isQuestionnaireUnlocked(
    userId: number,
    courseId: string,
  ): Promise<boolean> {
    const lessons = await this.entityManager.find(CourseLesson, {
      where: { courseId },
    });
    if (lessons.length === 0) return true;

    const progresses = await this.entityManager.find(CourseLessonProgress, {
      where: { userId, lessonId: In(lessons.map((l) => l.id)) },
    });
    const progressByLesson = new Map(
      progresses.map((p) => [p.lessonId, p.maxWatchedPercentage]),
    );

    return lessons.every(
      (lesson) =>
        (progressByLesson.get(lesson.id) ?? 0) >= REQUIRED_WATCH_PERCENTAGE,
    );
  }

  private gradeAnswers(
    questions: CourseQuestion[],
    options: CourseQuestionOption[],
    answers: QuestionnaireAnswerDto[],
  ): { scorePercentage: number } {
    const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));
    const scoredQuestions = questions.filter((q) => q.type !== 'free_text');

    if (scoredQuestions.length === 0) {
      return { scorePercentage: 100 };
    }

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of scoredQuestions) {
      totalPoints += question.points;
      const answer = answerByQuestion.get(question.id);
      const questionOptions = options.filter(
        (o) => o.questionId === question.id,
      );
      const correctOptionIds = new Set(
        questionOptions.filter((o) => o.isCorrect).map((o) => o.id),
      );
      const selectedOptionIds = new Set(answer?.option_ids ?? []);

      const isCorrect =
        selectedOptionIds.size === correctOptionIds.size &&
        [...selectedOptionIds].every((id) => correctOptionIds.has(id));

      if (isCorrect) {
        earnedPoints += question.points;
      }
    }

    const scorePercentage =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;

    return { scorePercentage };
  }

  async submitQuestionnaire(
    userId: number,
    courseId: string,
    answers: QuestionnaireAnswerDto[],
  ) {
    const unlocked = await this.isQuestionnaireUnlocked(userId, courseId);
    if (!unlocked) {
      throw new ForbiddenException({
        code: 'COURSE_NOT_WATCHED',
        message:
          'All lessons for this course must be watched to at least 90% before submitting the questionnaire.',
      });
    }

    const questionnaire =
      await this.courseQuestionnairesService.findEntityForCourseOrThrow(
        courseId,
      );

    const attemptsUsed = await this.courseQuestionnairesService.countAttempts(
      userId,
      questionnaire.id,
    );

    if (
      questionnaire.maxAttempts !== null &&
      attemptsUsed >= questionnaire.maxAttempts
    ) {
      throw new ConflictException({
        code: 'MAX_ATTEMPTS_EXCEEDED',
        message: `Maximum attempts (${questionnaire.maxAttempts}) exceeded for this questionnaire.`,
      });
    }

    const questions = await this.entityManager.find(CourseQuestion, {
      where: { questionnaireId: questionnaire.id },
    });
    if (questions.length === 0) {
      throw new BadRequestException(
        'This questionnaire has no questions configured.',
      );
    }
    const options = await this.entityManager.find(CourseQuestionOption, {
      where: { questionId: In(questions.map((q) => q.id)) },
    });

    const { scorePercentage } = this.gradeAnswers(questions, options, answers);
    const passed = scorePercentage >= questionnaire.passingScorePercentage;
    const attemptNumber = attemptsUsed + 1;

    // MUST assign an explicit array — never leave `answers` undefined before
    // save (jsonb {} regression, see commit 563626f).
    const normalizedAnswers: CourseQuestionnaireAnswer[] = answers.map((a) => ({
      question_id: a.question_id,
      option_ids: a.option_ids ?? [],
      text: a.text,
    }));

    const response = this.entityManager.create(CourseQuestionnaireResponse, {
      userId,
      questionnaireId: questionnaire.id,
      courseId,
      answers: normalizedAnswers,
      scorePercentage,
      passed,
      attemptNumber,
    });
    const savedResponse = await this.entityManager.save(response);

    let certificate: CourseCertificate | null = null;
    if (passed) {
      certificate = await this.issueCertificateIdempotently(
        userId,
        courseId,
        scorePercentage,
        savedResponse.id,
      );
      await this.syncTrackCompletion(userId, courseId);
    }

    return {
      score_percentage: scorePercentage,
      passed,
      passing_score_percentage: questionnaire.passingScorePercentage,
      attempt_number: attemptNumber,
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

  private async issueCertificateIdempotently(
    userId: number,
    courseId: string,
    scorePercentage: number,
    responseId: string,
  ): Promise<CourseCertificate> {
    const existing = await this.entityManager.findOne(CourseCertificate, {
      where: { userId, courseId },
    });
    if (existing) return existing;

    const certificate = this.entityManager.create(CourseCertificate, {
      userId,
      courseId,
      certificateCode: generateCertificateCode(),
      scorePercentage,
      responseId,
    });

    try {
      return await this.entityManager.save(certificate);
    } catch (error: unknown) {
      // Race: another concurrent passing attempt inserted it first — fetch and return it.
      const raceWinner = await this.entityManager.findOne(CourseCertificate, {
        where: { userId, courseId },
      });
      if (raceWinner) return raceWinner;
      throw error;
    }
  }

  async syncTrackCompletion(userId: number, courseId: string): Promise<void> {
    const memberships = await this.entityManager.find(CourseTrackCourse, {
      where: { courseId },
    });
    if (memberships.length === 0) return;

    const trackIds = memberships.map((m) => m.trackId);
    const tracks = await this.entityManager.find(CourseTrack, {
      where: { id: In(trackIds) },
    });

    for (const track of tracks) {
      if (track.journeyStageId === null) continue;

      const trackCourses = await this.entityManager.find(CourseTrackCourse, {
        where: { trackId: track.id },
      });
      const trackCourseIds = trackCourses.map((tc) => tc.courseId);
      if (trackCourseIds.length === 0) continue;

      const certificates = await this.entityManager.find(CourseCertificate, {
        where: { userId, courseId: In(trackCourseIds) },
      });
      const certifiedCourseIds = new Set(certificates.map((c) => c.courseId));

      const allCertified = trackCourseIds.every((id) =>
        certifiedCourseIds.has(id),
      );

      if (allCertified) {
        await this.memberJourneyService.completeStageIfNotCompleted(
          userId,
          track.journeyStageId,
          `Trilho "${track.title}" concluído via cursos.`,
        );
      }
    }
  }
}
