import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLifeGroupStudyNotificationCategory1795900000005
  implements MigrationInterface
{
  name = 'AddLifeGroupStudyNotificationCategory1795900000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 'life_group_study' is in NOTIFICATION_CATEGORIES (and the entity enum)
    // but no earlier migration added it to notification_category_enum, so on a
    // migration-built DB the Estudo do Life notification INSERT failed. Keep
    // this in its own migration/transaction: Postgres cannot use a newly added
    // enum value in the transaction that added it.
    await queryRunner.query(`
      ALTER TYPE notification_category_enum ADD VALUE IF NOT EXISTS 'life_group_study'
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values; the added
    // 'life_group_study' enum value is left in place on down.
  }
}
