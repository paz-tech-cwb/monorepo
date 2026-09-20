import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZipCodeToAddress1789862422 implements MigrationInterface {
  name = 'AddZipCodeToAddress1789862422';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "addresses" DROP COLUMN IF EXISTS "zipCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD COLUMN "zip_code" varchar(8)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "addresses" DROP COLUMN "zip_code"`);
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD COLUMN "zipCode" varchar(255)`,
    );
  }
}
