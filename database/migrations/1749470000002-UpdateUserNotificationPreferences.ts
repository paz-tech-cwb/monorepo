import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserNotificationPreferences1749470000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_notification_preferences
        ADD COLUMN IF NOT EXISTS member_journey_enabled boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS contributions_enabled boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_os_permission_enum') THEN
          CREATE TYPE notification_os_permission_enum AS ENUM ('granted', 'denied', 'not_determined');
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      ALTER TABLE user_notification_preferences
        ADD COLUMN IF NOT EXISTS os_permission_status notification_os_permission_enum NOT NULL DEFAULT 'not_determined'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_notification_preferences
        DROP COLUMN IF EXISTS os_permission_status,
        DROP COLUMN IF EXISTS contributions_enabled,
        DROP COLUMN IF EXISTS member_journey_enabled
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS notification_os_permission_enum`,
    );
  }
}
