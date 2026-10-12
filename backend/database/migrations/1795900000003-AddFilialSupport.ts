import { MigrationInterface, QueryRunner } from 'typeorm';

// Stage 1 of the multi-church (filial) rollout: adds structure only, no
// backfill and no NOT NULL/UNIQUE changes yet (those land in
// 1795900000004 and 1795900000005). Safe to run against a populated DB.
export class AddFilialSupport1795900000003 implements MigrationInterface {
  name = 'AddFilialSupport1795900000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Church (filial) metadata additions.
    await queryRunner.query(`
      ALTER TABLE "church" ADD COLUMN IF NOT EXISTS "slug" varchar(100) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "church"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_church_slug'
        ) THEN
          ALTER TABLE "church" ADD CONSTRAINT "UQ_church_slug" UNIQUE ("slug");
        END IF;
      END $$;
    `);

    // user_churches join table: a user may belong to multiple filiais; at
    // most one row per user is expected to carry is_primary = true
    // (enforced in the service layer).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_churches" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "church_id" integer NOT NULL REFERENCES "church"("id") ON DELETE CASCADE,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_churches_user_church" UNIQUE ("user_id", "church_id")
      )
    `);

    // Nullable church_id FKs on the four org-tree/content root tables.
    await queryRunner.query(`
      ALTER TABLE "areas" ADD COLUMN IF NOT EXISTS "church_id" integer NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_areas_church'
        ) THEN
          ALTER TABLE "areas" ADD CONSTRAINT "FK_areas_church"
            FOREIGN KEY ("church_id") REFERENCES "church"("id");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "church_id" integer NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_events_church'
        ) THEN
          ALTER TABLE "events" ADD CONSTRAINT "FK_events_church"
            FOREIGN KEY ("church_id") REFERENCES "church"("id");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "church_id" integer NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_announcements_church'
        ) THEN
          ALTER TABLE "announcements" ADD CONSTRAINT "FK_announcements_church"
            FOREIGN KEY ("church_id") REFERENCES "church"("id");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_cycles" ADD COLUMN IF NOT EXISTS "church_id" integer NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_casa_de_paz_cycles_church'
        ) THEN
          ALTER TABLE "casa_de_paz_cycles" ADD CONSTRAINT "FK_casa_de_paz_cycles_church"
            FOREIGN KEY ("church_id") REFERENCES "church"("id");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_cycles" DROP CONSTRAINT IF EXISTS "FK_casa_de_paz_cycles_church"
    `);
    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_cycles" DROP COLUMN IF EXISTS "church_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "FK_announcements_church"
    `);
    await queryRunner.query(`
      ALTER TABLE "announcements" DROP COLUMN IF EXISTS "church_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "FK_events_church"
    `);
    await queryRunner.query(`
      ALTER TABLE "events" DROP COLUMN IF EXISTS "church_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "areas" DROP CONSTRAINT IF EXISTS "FK_areas_church"
    `);
    await queryRunner.query(`
      ALTER TABLE "areas" DROP COLUMN IF EXISTS "church_id"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "user_churches"`);

    await queryRunner.query(`
      ALTER TABLE "church" DROP CONSTRAINT IF EXISTS "UQ_church_slug"
    `);
    await queryRunner.query(`
      ALTER TABLE "church" DROP COLUMN IF EXISTS "is_active"
    `);
    await queryRunner.query(`
      ALTER TABLE "church" DROP COLUMN IF EXISTS "slug"
    `);
  }
}
