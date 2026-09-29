import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCasaDePazReportAdultsAndGuests1795800000005
  implements MigrationInterface
{
  name = 'DropCasaDePazReportAdultsAndGuests1795800000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_reports"
      DROP COLUMN "adults",
      DROP COLUMN "guests"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Historical adults/guests counts are unrecoverable — re-added as
    // nullable/defaulted columns only to restore the schema shape, not the
    // original data.
    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_reports"
      ADD COLUMN "adults" int NOT NULL DEFAULT 0,
      ADD COLUMN "guests" int NOT NULL DEFAULT 0
    `);
  }
}
