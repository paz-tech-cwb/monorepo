import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAtmosphereToMinistries1780900000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = queryRunner.query.bind(queryRunner);
    // Rename tables (IF EXISTS guards keep this idempotent across environments)
    await q(`ALTER TABLE IF EXISTS "atmosphere_ministries" RENAME TO "ministries"`);
    await q(`ALTER TABLE IF EXISTS "atmosphere_teams" RENAME TO "ministry_teams"`);
    await q(`ALTER TABLE IF EXISTS "atmosphere_ministry_members" RENAME TO "ministry_members"`);
    await q(`ALTER TABLE IF EXISTS "atmosphere_team_members" RENAME TO "ministry_team_members"`);
    // New columns on ministries
    await q(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "description" text`);
    await q(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "co_leader_id" int`);
    await q(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "membership_mode" varchar(16) NOT NULL DEFAULT 'teams'`);
    await q(`ALTER TABLE "ministries" ADD CONSTRAINT "fk_ministries_co_leader" FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL`);
    // New column on ministry_teams
    await q(`ALTER TABLE "ministry_teams" ADD COLUMN IF NOT EXISTS "co_leader_id" int`);
    await q(`ALTER TABLE "ministry_teams" ADD CONSTRAINT "fk_ministry_teams_co_leader" FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL`);
    // New column on life_groups
    await q(`ALTER TABLE "life_groups" ADD COLUMN IF NOT EXISTS "co_leader_id" int`);
    await q(`ALTER TABLE "life_groups" ADD CONSTRAINT "fk_life_groups_co_leader" FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = queryRunner.query.bind(queryRunner);
    await q(`ALTER TABLE "life_groups" DROP CONSTRAINT IF EXISTS "fk_life_groups_co_leader"`);
    await q(`ALTER TABLE "life_groups" DROP COLUMN IF EXISTS "co_leader_id"`);
    await q(`ALTER TABLE "ministry_teams" DROP CONSTRAINT IF EXISTS "fk_ministry_teams_co_leader"`);
    await q(`ALTER TABLE "ministry_teams" DROP COLUMN IF EXISTS "co_leader_id"`);
    await q(`ALTER TABLE "ministries" DROP CONSTRAINT IF EXISTS "fk_ministries_co_leader"`);
    await q(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "membership_mode"`);
    await q(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "co_leader_id"`);
    await q(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "description"`);
    await q(`ALTER TABLE IF EXISTS "ministry_team_members" RENAME TO "atmosphere_team_members"`);
    await q(`ALTER TABLE IF EXISTS "ministry_members" RENAME TO "atmosphere_ministry_members"`);
    await q(`ALTER TABLE IF EXISTS "ministry_teams" RENAME TO "atmosphere_teams"`);
    await q(`ALTER TABLE IF EXISTS "ministries" RENAME TO "atmosphere_ministries"`);
  }
}
