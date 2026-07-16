import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAddressDetails1784073600000
  implements MigrationInterface
{
  name = 'AddUserAddressDetails1784073600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "number" varchar(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "complement" varchar(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "neighborhood" varchar(120)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "addresses" DROP COLUMN IF EXISTS "neighborhood"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" DROP COLUMN IF EXISTS "complement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" DROP COLUMN IF EXISTS "number"`,
    );
  }
}
