import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseProgressAndCertificates1795400000001
  implements MigrationInterface
{
  name = 'CreateCourseProgressAndCertificates1795400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "course_lesson_progress" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" integer NOT NULL,
        "lesson_id" uuid NOT NULL,
        "max_watched_percentage" integer NOT NULL DEFAULT 0,
        "last_position_seconds" integer NOT NULL DEFAULT 0,
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_lesson_progress" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_course_lesson_progress_user_lesson" UNIQUE ("user_id", "lesson_id"),
        CONSTRAINT "CHK_course_lesson_progress_percentage" CHECK ("max_watched_percentage" >= 0 AND "max_watched_percentage" <= 100),
        CONSTRAINT "FK_course_lesson_progress_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_lesson_progress_lesson" FOREIGN KEY ("lesson_id")
          REFERENCES "course_lessons"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "course_questionnaire_responses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" integer NOT NULL,
        "questionnaire_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "answers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "score_percentage" integer NOT NULL,
        "passed" boolean NOT NULL,
        "attempt_number" integer NOT NULL,
        "submitted_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_questionnaire_responses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_course_questionnaire_responses_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_questionnaire_responses_questionnaire" FOREIGN KEY ("questionnaire_id")
          REFERENCES "course_questionnaires"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_questionnaire_responses_course" FOREIGN KEY ("course_id")
          REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_course_questionnaire_responses_user_course"
        ON "course_questionnaire_responses" ("user_id", "course_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "course_certificates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" integer NOT NULL,
        "course_id" uuid NOT NULL,
        "certificate_code" character varying(32) NOT NULL,
        "issued_at" TIMESTAMP NOT NULL DEFAULT now(),
        "score_percentage" integer NOT NULL,
        "response_id" uuid,
        CONSTRAINT "PK_course_certificates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_course_certificates_certificate_code" UNIQUE ("certificate_code"),
        CONSTRAINT "UQ_course_certificates_user_course" UNIQUE ("user_id", "course_id"),
        CONSTRAINT "FK_course_certificates_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_certificates_course" FOREIGN KEY ("course_id")
          REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_certificates_response" FOREIGN KEY ("response_id")
          REFERENCES "course_questionnaire_responses"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "course_certificates"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_course_questionnaire_responses_user_course"`,
    );
    await queryRunner.query(`DROP TABLE "course_questionnaire_responses"`);
    await queryRunner.query(`DROP TABLE "course_lesson_progress"`);
  }
}
