import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeprecateCourseTrackJourneyStage1795600000002
  implements MigrationInterface
{
  name = 'DeprecateCourseTrackJourneyStage1795600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOTE: this drops any existing `journey_stage_id` links with no
    // backfill into the new journey_track_steps model. A full backfill
    // would require a product decision about which specific step each
    // course_track maps to, which is out of scope here (and, per the
    // seed migration, no course_completion step even has a real course_id
    // yet). We only log the affected row count for visibility so this
    // data loss is documented, not silent.
    const affected = (await queryRunner.query(`
      SELECT COUNT(*)::int AS "count" FROM "course_tracks"
      WHERE "journey_stage_id" IS NOT NULL
    `)) as Array<{ count: number }>;
    console.warn(
      `[DeprecateCourseTrackJourneyStage] Dropping "journey_stage_id" column; ` +
        `${affected[0]?.count ?? 0} course_tracks row(s) had a non-null value that will be discarded with no backfill.`,
    );

    await queryRunner.query(`
      ALTER TABLE "course_tracks" DROP COLUMN "journey_stage_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_tracks" ADD COLUMN "journey_stage_id" integer
    `);
  }
}
