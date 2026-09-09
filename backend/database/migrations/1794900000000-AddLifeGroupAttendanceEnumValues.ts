import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLifeGroupAttendanceEnumValues1794900000000
  implements MigrationInterface
{
  name = 'AddLifeGroupAttendanceEnumValues1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adding an enum value must happen in its own migration/transaction —
    // Postgres does not allow using a newly added enum value in the same
    // transaction that added it (see AddNotificationCategoryValues1749470000001).
    await queryRunner.query(`
      ALTER TYPE notification_category_enum ADD VALUE IF NOT EXISTS 'life_group_attendance'
    `);

    await queryRunner.query(`
      ALTER TYPE reminder_rule_type_enum ADD VALUE IF NOT EXISTS 'life_group_attendance'
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values; the added
    // 'life_group_attendance' enum values are left in place on down.
  }
}
