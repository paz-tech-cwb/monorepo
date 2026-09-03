import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLifeGroupReports1780900000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = '"life_group_reports"';
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "pastoring_activity_objective"`);
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN "pastoring_activity_type" TYPE text[] USING ARRAY["pastoring_activity_type"]::text[]`);
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN "training_activity_type" TYPE text[] USING ARRAY["training_activity_type"]::text[]`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = '"life_group_reports"';
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN "pastoring_activity_objective" text`);
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN "pastoring_activity_type" TYPE varchar(40) USING pastoring_activity_type[1]`);
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN "training_activity_type" TYPE varchar(40) USING training_activity_type[1]`);
  }
}
