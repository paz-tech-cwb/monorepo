import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurrenceFieldsToEvents1780800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
        RENAME COLUMN "date" TO "initial_date";

      ALTER TABLE "events"
        ADD COLUMN IF NOT EXISTS "final_date" timestamp,
        ADD COLUMN IF NOT EXISTS "description" varchar,
        ADD COLUMN IF NOT EXISTS "recurrence_type" varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
        DROP COLUMN IF EXISTS "recurrence_type",
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "final_date";

      ALTER TABLE "events"
        RENAME COLUMN "initial_date" TO "date";
    `);
  }
}
