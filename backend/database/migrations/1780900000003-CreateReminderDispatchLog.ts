import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReminderDispatchLog1780900000003
  implements MigrationInterface
{
  name = 'CreateReminderDispatchLog1780900000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reminder_dispatch_log" (
        "id" SERIAL PRIMARY KEY,
        "rule_type" varchar(32) NOT NULL,
        "dedupe_key" varchar(255) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_reminder_dispatch_dedupe" ON "reminder_dispatch_log" ("rule_type", "dedupe_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_reminder_dispatch_dedupe"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "reminder_dispatch_log"`);
  }
}
