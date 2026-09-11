import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds map-discovery fields to life_groups: latitude/longitude (geocoded
 * server-side from `location` on create/update, see
 * LifeGroupsService.geocodeLocation) and kids_count (set manually by
 * leaders/admins via admin-ui).
 */
export class AddLifeGroupMapFields1794800000000 implements MigrationInterface {
  name = 'AddLifeGroupMapFields1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "life_groups"
      ADD COLUMN IF NOT EXISTS "latitude" double precision,
      ADD COLUMN IF NOT EXISTS "longitude" double precision,
      ADD COLUMN IF NOT EXISTS "kids_count" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "life_groups"
      DROP COLUMN IF EXISTS "latitude",
      DROP COLUMN IF EXISTS "longitude",
      DROP COLUMN IF EXISTS "kids_count"
    `);
  }
}
