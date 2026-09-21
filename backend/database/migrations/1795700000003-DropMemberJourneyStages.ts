import { MigrationInterface, QueryRunner } from 'typeorm';

// The legacy member_journey feature (member_journey_stages table + its
// module) has been fully replaced by the configurable journey_tracks system
// (see CreateJourneyTracks1795600000000 / SeedJourneyTracks1795600000001,
// which already reads member_journey_stages one final time to import
// legacy completions before this table is dropped). Must run after
// SeedJourneyTracks1795600000001.
export class DropMemberJourneyStages1795700000003
  implements MigrationInterface
{
  name = 'DropMemberJourneyStages1795700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "member_journey_stages" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data cannot be restored. Recreate an empty table matching the real
    // pre-drop schema (post MergeMembersIntoUsers1757250000010, which
    // re-pointed member_id at users.id — the original
    // CreateMemberJourneyStages1757250000007 DDL referenced a "members"
    // table that no longer exists by this point in migration history).
    await queryRunner.query(`
      CREATE TABLE "member_journey_stages" (
        "id" SERIAL NOT NULL,
        "member_id" integer NOT NULL,
        "stage_id" integer NOT NULL,
        "stage_key" character varying(50) NOT NULL,
        "completed" boolean NOT NULL DEFAULT false,
        "completed_at" TIMESTAMP,
        "note" character varying(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_member_stage" UNIQUE ("member_id", "stage_id"),
        CONSTRAINT "PK_member_journey_stages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_member_journey_stages_user_id"
          FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mjs_member_id" ON "member_journey_stages"("member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mjs_completed" ON "member_journey_stages"("completed", "completed_at")`,
    );
  }
}
