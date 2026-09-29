import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCasaDePazReportGuests1795800000002
  implements MigrationInterface
{
  name = 'CreateCasaDePazReportGuests1795800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "casa_de_paz_report_guests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "report_id" uuid NOT NULL REFERENCES "casa_de_paz_reports"("id") ON DELETE CASCADE,
        "user_id" int REFERENCES "users"("id"),
        "name" varchar(180) NOT NULL,
        "email" varchar(180) NOT NULL,
        "birth_date" date NOT NULL,
        "whatsapp" varchar(32),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_casa_de_paz_report_guests_report_id" ON "casa_de_paz_report_guests" ("report_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_casa_de_paz_report_guests_report_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "casa_de_paz_report_guests"`);
  }
}
