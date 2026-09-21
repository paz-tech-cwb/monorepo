import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJourneyTracks1795600000000 implements MigrationInterface {
  name = 'CreateJourneyTracks1795600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "journey_tracks" (
        "id" SERIAL NOT NULL,
        "key" character varying(50) NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "eligibility_text" text,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_journey_tracks_key" UNIQUE ("key"),
        CONSTRAINT "PK_journey_tracks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "journey_track_steps" (
        "id" SERIAL NOT NULL,
        "track_id" integer NOT NULL,
        "key" character varying(60),
        "sort_order" integer NOT NULL DEFAULT 0,
        "type" character varying(30) NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "course_id" uuid,
        "external_url" character varying(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_journey_track_steps" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_journey_track_steps_track_key" UNIQUE ("track_id", "key"),
        CONSTRAINT "FK_journey_track_steps_track" FOREIGN KEY ("track_id")
          REFERENCES "journey_tracks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_journey_track_steps_course" FOREIGN KEY ("course_id")
          REFERENCES "courses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_journey_track_steps_course_id" ON "journey_track_steps" ("course_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_journey_track_steps_track_sort" ON "journey_track_steps" ("track_id", "sort_order")
    `);

    await queryRunner.query(`
      CREATE TABLE "member_journey_step_progress" (
        "id" SERIAL NOT NULL,
        "member_id" integer NOT NULL,
        "step_id" integer NOT NULL,
        "completed_at" TIMESTAMP NOT NULL,
        "source" character varying(20) NOT NULL,
        "completed_by_user_id" integer,
        "note" character varying(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_member_journey_step_progress" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_member_journey_step_progress_member_step" UNIQUE ("member_id", "step_id"),
        CONSTRAINT "FK_mjsp_member" FOREIGN KEY ("member_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mjsp_step" FOREIGN KEY ("step_id")
          REFERENCES "journey_track_steps"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mjsp_completed_by_user" FOREIGN KEY ("completed_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "journey_tracks" IS 'Member-facing "trilho" journey tracks (baptism, member, discipler, leader). Fully independent from course_tracks, which groups Courses in the academy feature only.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "member_journey_step_progress"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journey_track_steps_track_sort"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journey_track_steps_course_id"`,
    );
    await queryRunner.query(`DROP TABLE "journey_track_steps"`);
    await queryRunner.query(`DROP TABLE "journey_tracks"`);
  }
}
