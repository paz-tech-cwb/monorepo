import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeadingRelationsToUsers1780200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "leading_area_id" integer,
        ADD COLUMN IF NOT EXISTS "leading_sector_id" integer,
        ADD COLUMN IF NOT EXISTS "leading_life_group_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "UQ_users_leading_area_id" UNIQUE ("leading_area_id"),
        ADD CONSTRAINT "UQ_users_leading_sector_id" UNIQUE ("leading_sector_id"),
        ADD CONSTRAINT "UQ_users_leading_life_group_id" UNIQUE ("leading_life_group_id"),
        ADD CONSTRAINT "FK_users_leading_area_id"
          FOREIGN KEY ("leading_area_id") REFERENCES "areas"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_users_leading_sector_id"
          FOREIGN KEY ("leading_sector_id") REFERENCES "sectors"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_users_leading_life_group_id"
          FOREIGN KEY ("leading_life_group_id") REFERENCES "life_groups"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP CONSTRAINT IF EXISTS "FK_users_leading_life_group_id",
        DROP CONSTRAINT IF EXISTS "FK_users_leading_sector_id",
        DROP CONSTRAINT IF EXISTS "FK_users_leading_area_id",
        DROP CONSTRAINT IF EXISTS "UQ_users_leading_life_group_id",
        DROP CONSTRAINT IF EXISTS "UQ_users_leading_sector_id",
        DROP CONSTRAINT IF EXISTS "UQ_users_leading_area_id",
        DROP COLUMN IF EXISTS "leading_life_group_id",
        DROP COLUMN IF EXISTS "leading_sector_id",
        DROP COLUMN IF EXISTS "leading_area_id"
    `);
  }
}
