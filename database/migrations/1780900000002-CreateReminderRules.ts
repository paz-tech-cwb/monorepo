import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReminderRules1780900000002 implements MigrationInterface {
  name = 'CreateReminderRules1780900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "reminder_rule_type_enum" AS ENUM ('form_report', 'event', 'member_journey')`,
    );
    await queryRunner.query(`
      CREATE TABLE "reminder_rules" (
        "id" SERIAL PRIMARY KEY,
        "type" "reminder_rule_type_enum" NOT NULL UNIQUE,
        "enabled" boolean NOT NULL DEFAULT false,
        "config" jsonb NOT NULL DEFAULT '{}',
        "last_run_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "reminder_rules" ("type", "enabled", "config") VALUES
        ('form_report', false, '{"weekday":0,"hour":20,"minute":0,"roles":["life_group_leader","sector_leader","area_leader"]}'),
        ('event', false, '{"lead_times_hours":[24,1]}'),
        ('member_journey', false, '{"threshold_days":7,"steps":[]}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reminder_rules"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reminder_rule_type_enum"`);
  }
}
