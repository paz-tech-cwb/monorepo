import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterNotificationsTable1757250000020 implements MigrationInterface {
  name = 'AlterNotificationsTable1757250000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_category_enum" AS ENUM (
        'events', 'announcements', 'life_group', 'academy', 'admin_alerts'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM (
        'pending', 'processing', 'scheduled', 'sent', 'failed'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN "category" "notification_category_enum" NOT NULL DEFAULT 'announcements',
        ADD COLUMN "segment" jsonb NOT NULL DEFAULT '{"type":"all"}',
        ADD COLUMN "scheduled_at" timestamp NULL,
        ADD COLUMN "created_by" integer NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications" RENAME COLUMN "recipients" TO "recipients_count"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP COLUMN IF EXISTS "target_audience"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ALTER COLUMN "status" TYPE "notification_status_enum"
        USING "status"::"notification_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD CONSTRAINT "FK_notifications_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
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
