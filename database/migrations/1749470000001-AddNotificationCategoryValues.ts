import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationCategoryValues1749470000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_category_enum') THEN
          CREATE TYPE notification_category_enum AS ENUM (
            'events',
            'announcements',
            'life_group',
            'academy',
            'admin_alerts',
            'forms',
            'member_journey',
            'contributions',
            'meeting_reports'
          );
        ELSE
          ALTER TYPE notification_category_enum ADD VALUE IF NOT EXISTS 'forms';
          ALTER TYPE notification_category_enum ADD VALUE IF NOT EXISTS 'member_journey';
          ALTER TYPE notification_category_enum ADD VALUE IF NOT EXISTS 'contributions';
          ALTER TYPE notification_category_enum ADD VALUE IF NOT EXISTS 'meeting_reports';
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from an enum type.
    // To rollback, recreate the enum without the added values and cast the column.
    await queryRunner.query(`
      DELETE FROM notifications WHERE category IN ('forms', 'member_journey', 'contributions', 'meeting_reports')
    `);
    await queryRunner.query(`
      ALTER TABLE notifications
        ALTER COLUMN category TYPE varchar(50)
    `);
    await queryRunner.query(`DROP TYPE notification_category_enum`);
    await queryRunner.query(`
      CREATE TYPE notification_category_enum AS ENUM (
        'events', 'announcements', 'life_group', 'academy', 'admin_alerts'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE notifications
        ALTER COLUMN category TYPE notification_category_enum
          USING category::notification_category_enum
    `);
  }
}
