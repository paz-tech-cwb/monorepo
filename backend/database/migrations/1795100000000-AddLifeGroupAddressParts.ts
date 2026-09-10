import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds city/neighborhood/state to life_groups, populated from Nominatim's
 * `addressdetails=1` on the same forward-geocode call already made in
 * LifeGroupsService.geocodeLocation (no extra HTTP round-trip). Existing
 * rows are backfilled separately via
 * `scripts/backfill-life-group-address-parts.ts`.
 */
export class AddLifeGroupAddressParts1795100000000
  implements MigrationInterface
{
  name = 'AddLifeGroupAddressParts1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "life_groups"
      ADD COLUMN IF NOT EXISTS "city" varchar(255),
      ADD COLUMN IF NOT EXISTS "neighborhood" varchar(255),
      ADD COLUMN IF NOT EXISTS "state" varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "life_groups"
      DROP COLUMN IF EXISTS "city",
      DROP COLUMN IF EXISTS "neighborhood",
      DROP COLUMN IF EXISTS "state"
    `);
  }
}
