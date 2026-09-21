import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseTrackJourneyStageAndOrder1795400000002
  implements MigrationInterface
{
  name = 'AddCourseTrackJourneyStageAndOrder1795400000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_tracks" ADD COLUMN "journey_stage_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "course_track_courses" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_track_courses" DROP COLUMN "sort_order"
    `);
    await queryRunner.query(`
      ALTER TABLE "course_tracks" DROP COLUMN "journey_stage_id"
    `);
  }
}
