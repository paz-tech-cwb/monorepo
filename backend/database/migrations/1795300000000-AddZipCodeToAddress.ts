import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZipCodeToAddress1795300000000 implements MigrationInterface {
  name = 'AddZipCodeToAddress1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('addresses');
    const hasLegacyZipCode = !!table?.findColumnByName('zipCode');
    const hasZipCode = !!table?.findColumnByName('zip_code');

    if (hasLegacyZipCode && !hasZipCode) {
      // Preserve any existing data by renaming rather than dropping + re-adding.
      await queryRunner.query(
        `ALTER TABLE "addresses" RENAME COLUMN "zipCode" TO "zip_code"`,
      );
      await queryRunner.query(
        `ALTER TABLE "addresses" ALTER COLUMN "zip_code" TYPE varchar(8)`,
      );
      await queryRunner.query(
        `ALTER TABLE "addresses" ALTER COLUMN "zip_code" DROP NOT NULL`,
      );
    } else if (!hasZipCode) {
      await queryRunner.query(
        `ALTER TABLE "addresses" ADD COLUMN "zip_code" varchar(8)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "addresses" RENAME COLUMN "zip_code" TO "zipCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ALTER COLUMN "zipCode" TYPE varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ALTER COLUMN "zipCode" SET NOT NULL`,
    );
  }
}
