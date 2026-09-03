import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFormGuestsSchema1780900000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "phone" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "how_met_church" TYPE text`);
    await queryRunner.query(`ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "filled_by" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "via_casa_de_paz" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "invited_by" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "form_guests" ADD COLUMN "email" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "phone" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "form_guests" ALTER COLUMN "how_met_church" TYPE varchar(40)`);
    await queryRunner.query(`ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "filled_by"`);
    await queryRunner.query(`ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "via_casa_de_paz"`);
  }
}
