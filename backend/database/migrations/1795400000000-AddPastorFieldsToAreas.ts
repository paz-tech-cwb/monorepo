import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPastorFieldsToAreas1795400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "areas"
        ADD COLUMN IF NOT EXISTS "pastor_id" integer,
        ADD COLUMN IF NOT EXISTS "co_pastor_id" integer
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_areas_pastor_id'
        ) THEN
          ALTER TABLE "areas"
            ADD CONSTRAINT "FK_areas_pastor_id"
              FOREIGN KEY ("pastor_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_areas_co_pastor_id'
        ) THEN
          ALTER TABLE "areas"
            ADD CONSTRAINT "FK_areas_co_pastor_id"
              FOREIGN KEY ("co_pastor_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_areas_pastor_id" ON "areas" ("pastor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_areas_co_pastor_id" ON "areas" ("co_pastor_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_areas_pastor_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_areas_co_pastor_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "areas"
        DROP CONSTRAINT IF EXISTS "FK_areas_pastor_id",
        DROP CONSTRAINT IF EXISTS "FK_areas_co_pastor_id",
        DROP COLUMN IF EXISTS "pastor_id",
        DROP COLUMN IF EXISTS "co_pastor_id"
    `);
  }
}
