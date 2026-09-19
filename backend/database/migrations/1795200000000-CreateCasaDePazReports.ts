import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCasaDePazReports1795200000000 implements MigrationInterface {
  name = 'CreateCasaDePazReports1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "casa_de_paz_reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "date" date NOT NULL,
        "facilitator" varchar(180) NOT NULL,
        "sector_id" int NOT NULL,
        "adults" int NOT NULL DEFAULT 0,
        "kids" int NOT NULL DEFAULT 0,
        "guests" int NOT NULL DEFAULT 0,
        "conversions" int NOT NULL DEFAULT 0,
        "week_number" int,
        "meeting_day" varchar(20),
        "meeting_time" varchar(5),
        "submitted_by_id" int NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_casa_de_paz_reports_date" ON "casa_de_paz_reports" ("date")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_casa_de_paz_reports_sector_id" ON "casa_de_paz_reports" ("sector_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_casa_de_paz_reports_sector_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_casa_de_paz_reports_date"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "casa_de_paz_reports"`);
  }
}
