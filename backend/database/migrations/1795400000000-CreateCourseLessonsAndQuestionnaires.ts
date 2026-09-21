import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseLessonsAndQuestionnaires1795400000000
  implements MigrationInterface
{
  name = 'CreateCourseLessonsAndQuestionnaires1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "course_lessons" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "youtube_video_id" character varying(32) NOT NULL,
        "duration_seconds" integer,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_lessons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_course_lessons_course" FOREIGN KEY ("course_id")
          REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_course_lessons_course_id" ON "course_lessons" ("course_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "course_questionnaires" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "passing_score_percentage" integer NOT NULL DEFAULT 70,
        "max_attempts" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_questionnaires" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_course_questionnaires_course_id" UNIQUE ("course_id"),
        CONSTRAINT "FK_course_questionnaires_course" FOREIGN KEY ("course_id")
          REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "course_questions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "questionnaire_id" uuid NOT NULL,
        "text" text NOT NULL,
        "type" character varying(20) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "points" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_questions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_course_questions_questionnaire" FOREIGN KEY ("questionnaire_id")
          REFERENCES "course_questionnaires"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "course_question_options" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL,
        "text" text NOT NULL,
        "is_correct" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_course_question_options" PRIMARY KEY ("id"),
        CONSTRAINT "FK_course_question_options_question" FOREIGN KEY ("question_id")
          REFERENCES "course_questions"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "course_question_options"`);
    await queryRunner.query(`DROP TABLE "course_questions"`);
    await queryRunner.query(`DROP TABLE "course_questionnaires"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_lessons_course_id"`);
    await queryRunner.query(`DROP TABLE "course_lessons"`);
  }
}
