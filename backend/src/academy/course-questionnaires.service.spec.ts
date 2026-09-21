import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseQuestionnairesService } from './course-questionnaires.service';

describe('CourseQuestionnairesService', () => {
  describe('validation', () => {
    function buildService() {
      const manager = {
        transaction: jest.fn(),
      };
      return new CourseQuestionnairesService(manager as never);
    }

    it('rejects a single_choice question with 0 correct options', async () => {
      const service = buildService();
      await expect(
        service.upsertForCourse('course-1', {
          title: 'Quiz',
          questions: [
            {
              text: 'Q1',
              type: 'single_choice',
              options: [
                { text: 'A', is_correct: false },
                { text: 'B', is_correct: false },
              ],
            },
          ],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a single_choice question with 2+ correct options', async () => {
      const service = buildService();
      await expect(
        service.upsertForCourse('course-1', {
          title: 'Quiz',
          questions: [
            {
              text: 'Q1',
              type: 'single_choice',
              options: [
                { text: 'A', is_correct: true },
                { text: 'B', is_correct: true },
              ],
            },
          ],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a multiple_choice question with 1+ correct options', async () => {
      const manager = {
        transaction: jest.fn().mockResolvedValue('ok'),
      };
      const service = new CourseQuestionnairesService(manager as never);

      await expect(
        service.upsertForCourse('course-1', {
          title: 'Quiz',
          questions: [
            {
              text: 'Q1',
              type: 'multiple_choice',
              options: [
                { text: 'A', is_correct: true },
                { text: 'B', is_correct: false },
              ],
            },
          ],
        } as never),
      ).resolves.toBe('ok');
    });
  });

  describe('transactional replace upsert', () => {
    it('deletes removed questions/options and upserts the rest', async () => {
      const questionnaire = {
        id: 'questionnaire-1',
        courseId: 'course-1',
      };
      const existingQuestions = [
        { id: 'q-keep', questionnaireId: 'questionnaire-1' },
        { id: 'q-remove', questionnaireId: 'questionnaire-1' },
      ];
      const removedEntities: unknown[] = [];
      const savedQuestions: unknown[] = [];

      type WhereOpts = {
        where?: { questionnaireId?: string; questionId?: string };
      };
      type Entity = { id?: string; [key: string]: unknown };

      const txManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(questionnaire) // existing questionnaire lookup
          .mockResolvedValue(questionnaire),
        create: jest
          .fn()
          .mockImplementation((_entity: unknown, value: Entity) => value),
        save: jest
          .fn()
          .mockImplementation((_entity: unknown, value: Entity) => {
            savedQuestions.push(value);
            return Promise.resolve({
              ...value,
              id: value.id ?? 'new-question-id',
            });
          }),
        find: jest
          .fn()
          .mockImplementation((_entity: unknown, opts: WhereOpts) => {
            if (opts?.where?.questionnaireId) return existingQuestions;
            if (opts?.where?.questionId) return [];
            return [];
          }),
        remove: jest
          .fn()
          .mockImplementation(
            (_entity: unknown, entities: Entity | Entity[]) => {
              removedEntities.push(
                ...(Array.isArray(entities) ? entities : [entities]),
              );
              return Promise.resolve();
            },
          ),
      };

      const manager = {
        transaction: jest
          .fn()
          .mockImplementation((cb: (m: typeof txManager) => Promise<unknown>) =>
            cb(txManager),
          ),
      };

      const service = new CourseQuestionnairesService(manager as never);
      jest.spyOn(service, 'findForCourseAdmin').mockResolvedValue({
        id: 'questionnaire-1',
      } as never);

      await service.upsertForCourse('course-1', {
        title: 'Quiz',
        questions: [
          {
            id: 'q-keep',
            text: 'Kept question',
            type: 'free_text',
          },
        ],
      } as never);

      expect(removedEntities).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'q-remove' })]),
      );
      expect(
        removedEntities.some((q) => (q as { id: string }).id === 'q-keep'),
      ).toBe(false);
    });
  });

  describe('member-facing response', () => {
    it('never includes is_correct on options', async () => {
      const questionnaire = { id: 'questionnaire-1', courseId: 'course-1' };
      const questions = [
        {
          id: 'q1',
          text: 'Q1',
          type: 'single_choice',
          sortOrder: 0,
          points: 1,
        },
      ];
      const options = [
        {
          id: 'o1',
          questionId: 'q1',
          text: 'A',
          isCorrect: true,
          sortOrder: 0,
        },
        {
          id: 'o2',
          questionId: 'q1',
          text: 'B',
          isCorrect: false,
          sortOrder: 1,
        },
      ];

      type WhereOpts = { where?: { questionnaireId?: string } };
      const manager = {
        findOne: jest.fn().mockResolvedValue(questionnaire),
        find: jest
          .fn()
          .mockImplementation((_entity: unknown, opts: WhereOpts) => {
            if (opts?.where?.questionnaireId) return questions;
            return options;
          }),
      };

      const service = new CourseQuestionnairesService(manager as never);
      const result = await service.findForCourseMember('course-1');

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('is_correct');
    });

    it('throws NotFoundException when no questionnaire exists', async () => {
      const manager = { findOne: jest.fn().mockResolvedValue(null) };
      const service = new CourseQuestionnairesService(manager as never);

      await expect(service.findForCourseMember('course-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
