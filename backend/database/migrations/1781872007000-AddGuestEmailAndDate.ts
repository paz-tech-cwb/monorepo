import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestEmailAndDate1781872007000 implements MigrationInterface {
  name = 'AddGuestEmailAndDate1781872007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "email" varchar(180)`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "created_user_id" integer REFERENCES "users"("id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "created_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "email"`,
    );
  }
}
