import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCycleToCasaDePazReports1795800000001
  implements MigrationInterface
{
  name = 'AddCycleToCasaDePazReports1795800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable for now — backfilled and made NOT NULL in
    // 1795800000003-BackfillAndRequireCasaDePazCycle.
    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_reports"
      ADD COLUMN "casa_de_paz_id" uuid REFERENCES "casa_de_paz_cycles"("id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_casa_de_paz_reports_casa_de_paz_id" ON "casa_de_paz_reports" ("casa_de_paz_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_casa_de_paz_reports_casa_de_paz_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "casa_de_paz_reports" DROP COLUMN IF EXISTS "casa_de_paz_id"`,
    );
  }
}
