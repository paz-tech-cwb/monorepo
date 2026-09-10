import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLifeGroupAttendance1795000000000
  implements MigrationInterface
{
  name = 'CreateLifeGroupAttendance1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Category used by attendance reminder notifications. Deliberately not
    // added to CATEGORY_PREF_MAP so leaders cannot opt out of it.
    // Enum values are added in AddLifeGroupAttendanceEnumValues1794900000000,
    // which must run before this migration (Postgres forbids using a newly
    // added enum value in the same transaction that added it).
    await queryRunner.query(`
      CREATE TABLE "life_group_attendance" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "life_group_id" int NOT NULL REFERENCES "life_groups"("id"),
        "meeting_date" date NOT NULL,
        "present_count" int NOT NULL DEFAULT 0,
        "members_count" int NOT NULL DEFAULT 0,
        "recorded_by" int NOT NULL REFERENCES "users"("id"),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_life_group_attendance_group_date" UNIQUE ("life_group_id", "meeting_date")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "life_group_attendance_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "attendance_id" uuid NOT NULL REFERENCES "life_group_attendance"("id") ON DELETE CASCADE,
        "user_id" int NOT NULL REFERENCES "users"("id"),
        "present" boolean NOT NULL DEFAULT false,
        CONSTRAINT "uq_life_group_attendance_entries_attendance_user" UNIQUE ("attendance_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_life_group_attendance_entries_attendance_id"
        ON "life_group_attendance_entries" ("attendance_id")
    `);

    // Seeded enabled by default (unlike other reminder rules) — attendance
    // tracking is core to the leader's job, not an optional convenience.
    await queryRunner.query(`
      INSERT INTO "reminder_rules" ("type", "enabled", "config") VALUES
        ('life_group_attendance', true, '{"hours_after_meeting_start":2,"title":"Lançar presença do Life Group","message":"A reunião do seu Life Group já começou. Não se esqueça de lançar a presença dos membros."}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "reminder_rules" WHERE "type" = 'life_group_attendance'`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "life_group_attendance_entries"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "life_group_attendance"`);
  }
}
