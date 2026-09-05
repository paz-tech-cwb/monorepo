import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceSupervisorReports1780900000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const t of ['"sector_supervisor_reports"', '"area_supervisor_reports"']) {
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "meetings_held"`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "trainings_conducted"`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "pastoral_visits"`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "life_groups_count" int NOT NULL DEFAULT 0`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "life_groups_supervised" int NOT NULL DEFAULT 0`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "life_group_observations" text[] NOT NULL DEFAULT '{}'`);
    }
    await queryRunner.query(`ALTER TABLE "sector_supervisor_reports" ADD COLUMN IF NOT EXISTS "sector_multiplication_date" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of ['"sector_supervisor_reports"', '"area_supervisor_reports"']) {
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN "meetings_held" int NOT NULL DEFAULT 0`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN "trainings_conducted" int NOT NULL DEFAULT 0`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "life_groups_count"`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "life_groups_supervised"`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "life_group_observations"`);
    }
    await queryRunner.query(`ALTER TABLE "sector_supervisor_reports" DROP COLUMN IF EXISTS "sector_multiplication_date"`);
  }
}
