import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterNotificationsTable1757250000020 implements MigrationInterface {
  name = 'AlterNotificationsTable1757250000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums — ignore if already exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_category_enum" AS ENUM ('events', 'announcements', 'life_group', 'academy', 'admin_alerts');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'processing', 'scheduled', 'sent', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // New columns — ignore if already exist
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "category" "notification_category_enum" NOT NULL DEFAULT 'announcements'`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "segment" jsonb NOT NULL DEFAULT '{"type":"all"}'`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_by" integer NULL`);

    // Rename recipients → recipients_count only if old column still exists
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='recipients') THEN
          ALTER TABLE "notifications" RENAME COLUMN "recipients" TO "recipients_count";
        END IF;
      END $$
    `);

    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "target_audience"`);

    // Cast status to enum only if it is still varchar
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='notifications' AND column_name='status' AND udt_name='varchar'
        ) THEN
          ALTER TABLE "notifications"
            ALTER COLUMN "status" TYPE "notification_status_enum"
            USING "status"::"notification_status_enum";
        END IF;
      END $$
    `);

    // FK — ignore if already exists
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name='FK_notifications_created_by'
        ) THEN
          ALTER TABLE "notifications"
            ADD CONSTRAINT "FK_notifications_created_by"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_created_by"`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" TYPE varchar(20) USING "status"::text`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "target_audience" varchar(100) NOT NULL DEFAULT 'all'`);
    await queryRunner.query(`ALTER TABLE "notifications" RENAME COLUMN "recipients_count" TO "recipients"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "created_by"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "scheduled_at"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "segment"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_category_enum"`);
  }
}
