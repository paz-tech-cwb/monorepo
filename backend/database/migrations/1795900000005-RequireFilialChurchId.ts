import { MigrationInterface, QueryRunner } from 'typeorm';

// Stage 3 of the filial rollout: enforces NOT NULL on the four backfilled
// church_id columns, replaces casa_de_paz_cycles' global UNIQUE(month) with
// a composite UNIQUE(church_id, month) so two filiais can open the same
// calendar month, and indexes all four church_id columns.
export class RequireFilialChurchId1795900000005 implements MigrationInterface {
  name = 'RequireFilialChurchId1795900000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "areas" ALTER COLUMN "church_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "events" ALTER COLUMN "church_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "announcements" ALTER COLUMN "church_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_cycles" ALTER COLUMN "church_id" SET NOT NULL
    `);

    // Drop the old global unique on month and replace it with a
    // per-filial composite unique. The constraint name matches what
    // TypeORM's `unique: true` column option generated originally
    // ("UQ_<hash>") — look it up dynamically instead of hardcoding it,
    // since the auto-generated name isn't guaranteed stable across
    // TypeORM versions.
    await queryRunner.query(`
      DO $$
      DECLARE
        v_constraint_name text;
      BEGIN
        SELECT conname INTO v_constraint_name
        FROM pg_constraint
        WHERE conrelid = '"casa_de_paz_cycles"'::regclass
          AND contype = 'u'
          AND array_length(conkey, 1) = 1
          AND conkey[1] = (
            SELECT attnum FROM pg_attribute
            WHERE attrelid = '"casa_de_paz_cycles"'::regclass AND attname = 'month'
          );

        IF v_constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "casa_de_paz_cycles" DROP CONSTRAINT %I', v_constraint_name);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_casa_de_paz_cycles_church_month'
        ) THEN
          ALTER TABLE "casa_de_paz_cycles"
            ADD CONSTRAINT "UQ_casa_de_paz_cycles_church_month" UNIQUE ("church_id", "month");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_areas_church_id" ON "areas" ("church_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_events_church_id" ON "events" ("church_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_announcements_church_id" ON "announcements" ("church_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_casa_de_paz_cycles_church_id" ON "casa_de_paz_cycles" ("church_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_casa_de_paz_cycles_church_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_announcements_church_id"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_church_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_areas_church_id"`);

    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_cycles"
      DROP CONSTRAINT IF EXISTS "UQ_casa_de_paz_cycles_church_month"
    `);
    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_cycles" ADD CONSTRAINT "UQ_casa_de_paz_cycles_month" UNIQUE ("month")
    `);

    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_cycles" ALTER COLUMN "church_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "announcements" ALTER COLUMN "church_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "events" ALTER COLUMN "church_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "areas" ALTER COLUMN "church_id" DROP NOT NULL
    `);
  }
}
