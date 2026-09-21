import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { CourseQuestionnaire } from './entities/course-questionnaire.entity';
import { CourseQuestion } from './entities/course-question.entity';
import { CourseQuestionOption } from './entities/course-question-option.entity';
import { CourseQuestionnaireResponse } from './entities/course-questionnaire-response.entity';
import { UpsertCourseQuestionnaireDto } from './dto/upsert-course-questionnaire.dto';
import { DEFAULT_PASSING_SCORE } from './constants';

@Injectable()
export class CourseQuestionnairesService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private validateQuestions(dto: UpsertCourseQuestionnaireDto): void {
    for (const question of dto.questions) {
      if (question.type === 'free_text') continue;

      const options = question.options ?? [];
      const correctCount = options.filter((o) => o.is_correct).length;

      if (question.type === 'single_choice' && correctCount !== 1) {
        throw new BadRequestException(
          `Single-choice question "${question.text}" must have exactly 1 correct option (found ${correctCount}).`,
        );
      }

      if (question.type === 'multiple_choice' && correctCount < 1) {
        throw new BadRequestException(
          `Multiple-choice question "${question.text}" must have at least 1 correct option.`,
        );
      }
    }
  }

  private async findEntityForCourse(
    courseId: string,
  ): Promise<CourseQuestionnaire | null> {
    return this.entityManager.findOne(CourseQuestionnaire, {
      where: { courseId },
    });
  }

  /** Admin response — includes `is_correct` on every option. */
  async findForCourseAdmin(courseId: string) {
    const questionnaire = await this.findEntityForCourse(courseId);
    if (!questionnaire) {
      throw new NotFoundException(
        `Questionnaire for course ${courseId} not found`,
      );
    }
    const questions = await this.entityManager.find(CourseQuestion, {
      where: { questionnaireId: questionnaire.id },
      order: { sortOrder: 'ASC' },
    });
    const options = await this.entityManager.find(CourseQuestionOption, {
      where: { questionId: In(questions.map((q) => q.id)) },
      order: { sortOrder: 'ASC' },
    });

    return this.toResponse(questionnaire, questions, options, true);
  }

  /** Member-facing response — MUST NEVER include `is_correct`. */
  async findForCourseMember(courseId: string) {
    const questionnaire = await this.findEntityForCourse(courseId);
    if (!questionnaire) {
      throw new NotFoundException(
        `Questionnaire for course ${courseId} not found`,
      );
    }
    const questions = await this.entityManager.find(CourseQuestion, {
      where: { questionnaireId: questionnaire.id },
      order: { sortOrder: 'ASC' },
    });
    const options = await this.entityManager.find(CourseQuestionOption, {
      where: { questionId: In(questions.map((q) => q.id)) },
      order: { sortOrder: 'ASC' },
    });

    return this.toResponse(questionnaire, questions, options, false);
  }

  async findEntityForCourseOrThrow(
    courseId: string,
  ): Promise<CourseQuestionnaire> {
    const questionnaire = await this.findEntityForCourse(courseId);
    if (!questionnaire) {
      throw new NotFoundException(
        `Questionnaire for course ${courseId} not found`,
      );
    }
    return questionnaire;
  }

  private toResponse(
    questionnaire: CourseQuestionnaire,
    questions: CourseQuestion[],
    options: CourseQuestionOption[],
    includeIsCorrect: boolean,
  ) {
    return {
      id: questionnaire.id,
      course_id: questionnaire.courseId,
      title: questionnaire.title,
      description: questionnaire.description ?? null,
      passing_score_percentage: questionnaire.passingScorePercentage,
      max_attempts: questionnaire.maxAttempts ?? null,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        sort_order: q.sortOrder,
        points: q.points,
        options: options
          .filter((o) => o.questionId === q.id)
          .map((o) => ({
            id: o.id,
            text: o.text,
            sort_order: o.sortOrder,
            ...(includeIsCorrect ? { is_correct: o.isCorrect } : {}),
          })),
      })),
    };
  }

  /** Transactional full-replace upsert: delete removed questions/options, upsert the rest. */
  async upsertForCourse(courseId: string, dto: UpsertCourseQuestionnaireDto) {
    this.validateQuestions(dto);

    return this.entityManager.transaction(async (manager) => {
      let questionnaire = await manager.findOne(CourseQuestionnaire, {
        where: { courseId },
      });

      if (!questionnaire) {
        questionnaire = manager.create(CourseQuestionnaire, { courseId });
      }

      questionnaire.title = dto.title;
      questionnaire.description = dto.description ?? null;
      questionnaire.passingScorePercentage =
        dto.passing_score_percentage ?? DEFAULT_PASSING_SCORE;
      questionnaire.maxAttempts = dto.max_attempts ?? null;
      questionnaire = await manager.save(CourseQuestionnaire, questionnaire);

      const existingQuestions = await manager.find(CourseQuestion, {
        where: { questionnaireId: questionnaire.id },
      });
      const incomingQuestionIds = new Set(
        dto.questions.filter((q) => q.id).map((q) => q.id as string),
      );
      const questionsToDelete = existingQuestions.filter(
        (q) => !incomingQuestionIds.has(q.id),
      );
      if (questionsToDelete.length > 0) {
        await manager.remove(CourseQuestion, questionsToDelete);
      }

      for (const [index, questionDto] of dto.questions.entries()) {
        let question = questionDto.id
          ? existingQuestions.find((q) => q.id === questionDto.id)
          : undefined;

        if (!question) {
          question = manager.create(CourseQuestion, {
            questionnaireId: questionnaire.id,
          });
        }

        question.text = questionDto.text;
        question.type = questionDto.type;
        question.sortOrder = questionDto.sort_order ?? index;
        question.points = questionDto.points ?? 1;
        question = await manager.save(CourseQuestion, question);

        const existingOptions = await manager.find(CourseQuestionOption, {
          where: { questionId: question.id },
        });
        const incomingOptionIds = new Set(
          (questionDto.options ?? [])
            .filter((o) => o.id)
            .map((o) => o.id as string),
        );
        const optionsToDelete = existingOptions.filter(
          (o) => !incomingOptionIds.has(o.id),
        );
        if (optionsToDelete.length > 0) {
          await manager.remove(CourseQuestionOption, optionsToDelete);
        }

        for (const [optIndex, optionDto] of (
          questionDto.options ?? []
        ).entries()) {
          let option = optionDto.id
            ? existingOptions.find((o) => o.id === optionDto.id)
            : undefined;

          if (!option) {
            option = manager.create(CourseQuestionOption, {
              questionId: question.id,
            });
          }

          option.text = optionDto.text;
          option.isCorrect = optionDto.is_correct;
          option.sortOrder = optionDto.sort_order ?? optIndex;
          await manager.save(CourseQuestionOption, option);
        }
      }

      return this.findForCourseAdmin(courseId);
    });
  }

  async removeForCourse(courseId: string): Promise<void> {
    const questionnaire = await this.findEntityForCourse(courseId);
    if (!questionnaire) return;
    await this.entityManager.remove(CourseQuestionnaire, questionnaire);
  }

  async countAttempts(
    userId: number,
    questionnaireId: string,
  ): Promise<number> {
    return this.entityManager.count(CourseQuestionnaireResponse, {
      where: { userId, questionnaireId },
    });
  }
}
