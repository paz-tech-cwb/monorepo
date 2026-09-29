import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCasaDePazLessons1795900000000 implements MigrationInterface {
  name = 'CreateCasaDePazLessons1795900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "casa_de_paz_lessons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "week" int NOT NULL,
        "title" varchar(160) NOT NULL,
        "summary" text NOT NULL,
        "guidelines" text NOT NULL,
        "questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "youtube_url" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_casa_de_paz_lessons_week" CHECK ("week" BETWEEN 1 AND 4)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_casa_de_paz_lessons_week" ON "casa_de_paz_lessons" ("week")
    `);

    await queryRunner.query(`
      INSERT INTO "casa_de_paz_lessons"
        ("week", "title", "summary", "guidelines", "questions", "youtube_url")
      VALUES
        (1, 'Semana 1 — Título a definir', '', '', '[]'::jsonb, NULL),
        (2, 'Semana 2 — Título a definir', '', '', '[]'::jsonb, NULL),
        (3, 'Semana 3 — Título a definir', '', '', '[]'::jsonb, NULL),
        (4, 'Semana 4 — Título a definir', '', '', '[]'::jsonb, NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_casa_de_paz_lessons_week"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "casa_de_paz_lessons"`);
  }
}
