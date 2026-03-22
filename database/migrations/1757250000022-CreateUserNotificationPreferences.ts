import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserNotificationPreferences1757250000022 implements MigrationInterface {
  name = 'CreateUserNotificationPreferences1757250000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_notification_preferences" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "all_notifications_enabled" boolean NOT NULL DEFAULT true,
        "push_enabled" boolean NOT NULL DEFAULT true,
        "email_enabled" boolean NOT NULL DEFAULT true,
        "sms_enabled" boolean NOT NULL DEFAULT true,
        "whatsapp_enabled" boolean NOT NULL DEFAULT true,
        "events_enabled" boolean NOT NULL DEFAULT true,
        "announcements_enabled" boolean NOT NULL DEFAULT true,
        "life_group_enabled" boolean NOT NULL DEFAULT true,
        "academy_enabled" boolean NOT NULL DEFAULT true,
        "admin_alerts_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_notification_preferences_user" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_notification_preferences_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_notification_preferences"`);
  }
}
