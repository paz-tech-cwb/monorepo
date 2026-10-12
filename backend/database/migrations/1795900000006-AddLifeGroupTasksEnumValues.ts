import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLifeGroupTasksEnumValues1795900000006
  implements MigrationInterface
{
  name = 'AddLifeGroupTasksEnumValues1795900000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adding an enum value must happen in its own migration/transaction —
    // Postgres does not allow using a newly added enum value in the same
    // transaction that added it (the seed in CreateLifeGroupTasks1795900000007
    // uses 'life_group_tasks').
    await queryRunner.query(`
      ALTER TYPE notification_category_enum ADD VALUE IF NOT EXISTS 'life_group_task'
    `);

    await queryRunner.query(`
      ALTER TYPE reminder_rule_type_enum ADD VALUE IF NOT EXISTS 'life_group_tasks'
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values; the added
    // enum values are left in place on down.
  }
}
