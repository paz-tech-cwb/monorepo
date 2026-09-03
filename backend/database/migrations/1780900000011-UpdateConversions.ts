import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateConversions1780900000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "birth_date"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "address"`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "street" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "neighborhood" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "city" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "culto_attendance" varchar(30)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "life_group_status" varchar(30)`);
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "how_met_church_other" varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversions" ADD COLUMN "address" text`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "street"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "neighborhood"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "culto_attendance"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "life_group_status"`);
    await queryRunner.query(`ALTER TABLE "conversions" DROP COLUMN IF EXISTS "how_met_church_other"`);
  }
}
