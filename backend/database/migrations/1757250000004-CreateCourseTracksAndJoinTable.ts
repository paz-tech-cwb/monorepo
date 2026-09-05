import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseTracksAndJoinTable1757250000004
  implements MigrationInterface
{
  name = 'CreateCourseTracksAndJoinTable1757250000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "course_tracks" (
        "id" SERIAL NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_tracks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "course_track_courses" (
        "track_id" integer NOT NULL,
        "course_id" uuid NOT NULL,
        CONSTRAINT "PK_course_track_courses" PRIMARY KEY ("track_id", "course_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "course_track_courses"
        ADD CONSTRAINT "FK_ctrack_courses_track"
          FOREIGN KEY ("track_id") REFERENCES "course_tracks"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_ctrack_courses_course"
          FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "course_track_courses"`);
    await queryRunner.query(`DROP TABLE "course_tracks"`);
  }
}
