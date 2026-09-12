import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaderFieldsToAreasAndSectors1795200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "areas"
        ADD COLUMN IF NOT EXISTS "leader_id" integer,
        ADD COLUMN IF NOT EXISTS "co_leader_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "sectors"
        ADD COLUMN IF NOT EXISTS "leader_id" integer,
        ADD COLUMN IF NOT EXISTS "co_leader_id" integer
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_areas_leader_id'
        ) THEN
          ALTER TABLE "areas"
            ADD CONSTRAINT "FK_areas_leader_id"
              FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_areas_co_leader_id'
        ) THEN
          ALTER TABLE "areas"
            ADD CONSTRAINT "FK_areas_co_leader_id"
              FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_sectors_leader_id'
        ) THEN
          ALTER TABLE "sectors"
            ADD CONSTRAINT "FK_sectors_leader_id"
              FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_sectors_co_leader_id'
        ) THEN
          ALTER TABLE "sectors"
            ADD CONSTRAINT "FK_sectors_co_leader_id"
              FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_sectors_area_id'
        ) THEN
          ALTER TABLE "sectors"
            ADD CONSTRAINT "FK_sectors_area_id"
              FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sectors"
        DROP CONSTRAINT IF EXISTS "FK_sectors_leader_id",
        DROP CONSTRAINT IF EXISTS "FK_sectors_co_leader_id",
        DROP COLUMN IF EXISTS "leader_id",
        DROP COLUMN IF EXISTS "co_leader_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "areas"
        DROP CONSTRAINT IF EXISTS "FK_areas_leader_id",
        DROP CONSTRAINT IF EXISTS "FK_areas_co_leader_id",
        DROP COLUMN IF EXISTS "leader_id",
        DROP COLUMN IF EXISTS "co_leader_id"
    `);
  }
}
