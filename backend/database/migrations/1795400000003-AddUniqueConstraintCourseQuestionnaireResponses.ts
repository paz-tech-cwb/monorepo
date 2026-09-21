import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintCourseQuestionnaireResponses1795400000003
  implements MigrationInterface
{
  name = 'AddUniqueConstraintCourseQuestionnaireResponses1795400000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_course_questionnaire_responses_user_questionnaire_attempt'
        ) THEN
          ALTER TABLE "course_questionnaire_responses"
            ADD CONSTRAINT "UQ_course_questionnaire_responses_user_questionnaire_attempt"
              UNIQUE ("user_id", "questionnaire_id", "attempt_number");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_questionnaire_responses"
        DROP CONSTRAINT IF EXISTS "UQ_course_questionnaire_responses_user_questionnaire_attempt"
    `);
  }
}
