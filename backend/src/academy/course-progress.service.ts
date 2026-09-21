import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
// Small fixed tolerance for clock/buffering jitter ON TOP of the time-based
// allowance below — NOT a flat per-call allowance. It is deliberately tiny
// because the time-based term already grows with real elapsed seconds.
const ANTI_CHEAT_BUFFER_PERCENTAGE = 3;
// When a lesson has no known duration, elapsed-time plausibility cannot be
// bounded at all, so the very first checkpoint a user ever reports for a
// lesson is capped at this conservative ceiling instead of trusting the raw
// client-reported value.
const FIRST_CHECKPOINT_MAX_PERCENTAGE_UNKNOWN_DURATION = 20;

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
  private readonly logger = new Logger(CourseProgressService.name);

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
    const now = new Date();
    const isFirstCheckpoint = !progress;

    if (!progress) {
      progress = this.entityManager.create(CourseLessonProgress, {
        userId,
        lessonId,
        maxWatchedPercentage: 0,
        lastPositionSeconds: 0,
        completedAt: null,
      });
    }

    // Anchor the plausibility ceiling to a STABLE per-row reference point —
    // the row's creation time (or "now" when this is the very first-ever
    // checkpoint, since the row doesn't exist yet) — rather than
    // `updatedAt`, which refreshes on every save. Anchoring to `updatedAt`
    // let N rapid successive requests each re-earn the flat anti-cheat
    // buffer against a near-zero elapsed time, accumulating N * buffer with
    // no real time cost. Anchoring to a stable timestamp means the
    // plausibility ceiling only grows with real wall-clock time, regardless
    // of how many requests are fired in a short window.
    const anchor = isFirstCheckpoint ? now : progress.createdAt;
    const elapsedSeconds = Math.max(
      0,
      (now.getTime() - anchor.getTime()) / 1000,
    );

    let allowedPercentage = requestedPercentage;

    if (lesson.durationSeconds && lesson.durationSeconds > 0) {
      const maxPlausiblePercentage = clamp(
        (elapsedSeconds / lesson.durationSeconds) *
          100 *
          ANTI_CHEAT_SPEED_MULTIPLIER +
          ANTI_CHEAT_BUFFER_PERCENTAGE,
        0,
        100,
      );
      allowedPercentage = Math.min(requestedPercentage, maxPlausiblePercentage);
    } else if (isFirstCheckpoint) {
      allowedPercentage = Math.min(
        requestedPercentage,
        FIRST_CHECKPOINT_MAX_PERCENTAGE_UNKNOWN_DURATION,
      );
    }

    allowedPercentage = clamp(allowedPercentage, 0, 100);

    return this.applyProgress(progress, allowedPercentage, dto);
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

    // MUST assign an explicit array — never leave `answers` undefined before
    // save (jsonb {} regression, see commit 563626f).
    const normalizedAnswers: CourseQuestionnaireAnswer[] = answers.map((a) => ({
      question_id: a.question_id,
      option_ids: a.option_ids ?? [],
      text: a.text,
    }));

    // Count-check + insert MUST be atomic w.r.t. concurrent submits from the
    // same user, otherwise two racing requests can both pass the
    // max_attempts check before either inserts (TOCTOU) and both commit,
    // producing duplicate attempt_number rows / unlimited attempts. A
    // per-(user, questionnaire) Postgres advisory transaction lock
    // serializes concurrent submitters, and the DB-level unique constraint
    // on (user_id, questionnaire_id, attempt_number) is a hard backstop in
    // case the lock is ever bypassed (e.g. a future direct-write path).
    let savedResponse: CourseQuestionnaireResponse;
    let attemptNumber: number;
    try {
      const result = await this.entityManager.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `course_questionnaire:${userId}:${questionnaire.id}`,
        ]);

        const attemptsUsed =
          await this.courseQuestionnairesService.countAttempts(
            userId,
            questionnaire.id,
            manager,
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

        const nextAttemptNumber = attemptsUsed + 1;
        const response = manager.create(CourseQuestionnaireResponse, {
          userId,
          questionnaireId: questionnaire.id,
          courseId,
          answers: normalizedAnswers,
          scorePercentage,
          passed,
          attemptNumber: nextAttemptNumber,
        });
        const saved = await manager.save(response);
        return { saved, attemptNumber: nextAttemptNumber };
      });
      savedResponse = result.saved;
      attemptNumber = result.attemptNumber;
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      // Backstop: a duplicate-key error on the unique constraint means the
      // max-attempts race was still lost — surface the correct 409 instead
      // of a generic 400/500.
      const isUniqueViolation =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23505';
      if (isUniqueViolation) {
        throw new ConflictException({
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: `Maximum attempts (${questionnaire.maxAttempts}) exceeded for this questionnaire.`,
        });
      }
      throw error;
    }

    // KNOWN FOLLOW-UP: response save (above), certificate issuance, and
    // journey sync are three separate uncommitted steps rather than one
    // transaction. `issueCertificateIdempotently` is idempotent (safe to
    // retry) and `syncTrackCompletion` is best-effort, so a crash between
    // steps can't duplicate state, but a passing response saved without a
    // certificate (e.g. process crash right after the response commit) is
    // possible today. Wrapping all three in one transaction is a larger
    // refactor left out of this fix's scope.
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
        // Best-effort: journey sync is a side effect of an already-issued
        // certificate, not the primary outcome. A concurrent completion of
        // another course in the same track can race on the unique
        // (member_id, stage_id) constraint in member_journey_stages — that
        // is an "already completed" race, not an error, so it must never
        // fail the questionnaire-submit response.
        try {
          await this.memberJourneyService.completeStageIfNotCompleted(
            userId,
            track.journeyStageId,
            `Trilho "${track.title}" concluído via cursos.`,
          );
        } catch (error: unknown) {
          this.logger.warn(
            `syncTrackCompletion: failed to complete journey stage ${track.journeyStageId} for user ${userId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }
  }
}
