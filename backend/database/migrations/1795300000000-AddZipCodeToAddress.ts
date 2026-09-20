import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalizes the addresses zip code column to `zip_code varchar(8) NULL`.
 *
 * Pre-existing rows may hold a hyphenated CEP (`"80410-000"`, 9 chars) written by
 * admin-ui before server-side normalization existed, so the type change MUST strip
 * non-digits (and clamp to 8 chars) in the same statement — otherwise the
 * `ALTER COLUMN ... TYPE varchar(8)` aborts the whole migration on real data.
 */
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
    }

    if (hasLegacyZipCode || hasZipCode) {
      // Digits-only + clamped to 8, so hyphenated legacy values survive the narrowing.
      await queryRunner.query(
        `ALTER TABLE "addresses" ALTER COLUMN "zip_code" TYPE varchar(8) ` +
          `USING LEFT(regexp_replace(COALESCE("zip_code", ''), '\\D', '', 'g'), 8)`,
      );
      // Drop NOT NULL BEFORE blanking out empties — a legacy NOT NULL column
      // would otherwise reject the UPDATE below.
      await queryRunner.query(
        `ALTER TABLE "addresses" ALTER COLUMN "zip_code" DROP NOT NULL`,
      );
      // Blank-out any value that normalized to an empty string, so the column is
      // either a real CEP or NULL — never ''.
      await queryRunner.query(
        `UPDATE "addresses" SET "zip_code" = NULL WHERE "zip_code" = ''`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE "addresses" ADD COLUMN "zip_code" varchar(8)`,
      );
    }
  }

  /**
   * Mirrors `up()`'s conditional branches. Deliberately does NOT force `NOT NULL`:
   * `up()` makes the column nullable and may have introduced NULLs, so blindly
   * re-adding the constraint would fail on real data.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('addresses');
    const hasZipCode = !!table?.findColumnByName('zip_code');
    const hasLegacyZipCode = !!table?.findColumnByName('zipCode');

    if (!hasZipCode || hasLegacyZipCode) {
      // Nothing to revert (or a legacy column is already in place) — stay a no-op
      // rather than failing the rollback.
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "addresses" RENAME COLUMN "zip_code" TO "zipCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ALTER COLUMN "zipCode" TYPE varchar(255)`,
    );
  }
}
