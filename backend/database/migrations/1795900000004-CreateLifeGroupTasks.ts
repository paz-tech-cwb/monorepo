import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLifeGroupTasks1795900000004 implements MigrationInterface {
  name = 'CreateLifeGroupTasks1795900000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "life_group_task_templates" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(150) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "guidance" text NOT NULL DEFAULT '',
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "life_group_task_overrides" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "life_group_id" int NOT NULL REFERENCES "life_groups"("id") ON DELETE CASCADE,
        "template_id" int NOT NULL REFERENCES "life_group_task_templates"("id") ON DELETE CASCADE,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "guidance_override" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_life_group_task_overrides_group_template" UNIQUE ("life_group_id", "template_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "life_group_task_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "life_group_id" int NOT NULL REFERENCES "life_groups"("id") ON DELETE CASCADE,
        "template_id" int NOT NULL REFERENCES "life_group_task_templates"("id"),
        "meeting_date" date NOT NULL,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "task_name" varchar(150) NOT NULL,
        "task_description" text NOT NULL DEFAULT '',
        "task_guidance" text NOT NULL DEFAULT '',
        "status" varchar(20) NOT NULL DEFAULT 'assigned',
        "source" varchar(20) NOT NULL DEFAULT 'auto',
        "notified_at" timestamptz NULL,
        "reminded_at" timestamptz NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_life_group_task_assignments_group_template_date" UNIQUE ("life_group_id", "template_id", "meeting_date"),
        CONSTRAINT "chk_life_group_task_assignments_status" CHECK ("status" IN ('assigned', 'declined', 'completed')),
        CONSTRAINT "chk_life_group_task_assignments_source" CHECK ("source" IN ('auto', 'manual', 'reroll'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_life_group_task_assignments_user_date"
        ON "life_group_task_assignments" ("user_id", "meeting_date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_life_group_task_assignments_group_date"
        ON "life_group_task_assignments" ("life_group_id", "meeting_date")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "life_group_task_member_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "life_group_id" int NOT NULL REFERENCES "life_groups"("id") ON DELETE CASCADE,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "eligible" boolean NOT NULL DEFAULT true,
        "reason" text NULL,
        "excluded_template_ids" int[] NULL,
        "updated_by" int NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_life_group_task_member_settings_group_user" UNIQUE ("life_group_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "life_group_task_group_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "life_group_id" int NOT NULL REFERENCES "life_groups"("id") ON DELETE CASCADE,
        "min_present_meetings" int NOT NULL DEFAULT 3,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_life_group_task_group_settings_group" UNIQUE ("life_group_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "life_group_task_skips" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "life_group_id" int NOT NULL REFERENCES "life_groups"("id") ON DELETE CASCADE,
        "meeting_date" date NOT NULL,
        "created_by" int NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_life_group_task_skips_group_date" UNIQUE ("life_group_id", "meeting_date")
      )
    `);

    // Join date for display/audit. Existing rows get the migration date; new
    // joins (TypeORM many-to-many inserts only user_id/life_group_id) get now().
    await queryRunner.query(`
      ALTER TABLE "user_life_groups"
        ADD COLUMN IF NOT EXISTS "joined_at" timestamptz NOT NULL DEFAULT now()
    `);

    // Grandfather every existing member: explicit eligible=true so the
    // "3 present meetings" rule only applies to members who join later.
    await queryRunner.query(`
      INSERT INTO "life_group_task_member_settings"
        ("life_group_id", "user_id", "eligible", "reason")
      SELECT "life_group_id", "user_id", true, 'grandfathered at migration'
      FROM "user_life_groups"
      ON CONFLICT ("life_group_id", "user_id") DO NOTHING
    `);

    // Seeded enabled by default. The enum value is added in
    // AddLifeGroupTasksEnumValues1795900000003 (must run first).
    await queryRunner.query(`
      INSERT INTO "reminder_rules" ("type", "enabled", "config") VALUES
        ('life_group_tasks', true, '{"days_before_meeting":[3,1],"hour":9,"title":"Sua tarefa no Life Group","message":"Você foi sorteado(a) para uma tarefa no próximo Life Group. Toque para ver o guia."}')
      ON CONFLICT ("type") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "reminder_rules" WHERE "type" = 'life_group_tasks'`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_life_groups" DROP COLUMN IF EXISTS "joined_at"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "life_group_task_skips"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "life_group_task_group_settings"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "life_group_task_member_settings"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "life_group_task_assignments"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "life_group_task_overrides"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "life_group_task_templates"`);
  }
}
