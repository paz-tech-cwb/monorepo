import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Supports case-insensitive name + birth_date identity matching used by the
 * Firebase social-login flow (see src/auth/auth.service.ts). The index is
 * intentionally non-unique: name+birthDate collisions across distinct people
 * are legitimate and must not violate a constraint — the application layer
 * treats multiple matches as ambiguous and skips auto-linking.
 */
export class AddUsersNameBirthDateMatchIndex1794700000000
  implements MigrationInterface
{
  name = 'AddUsersNameBirthDateMatchIndex1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_name_normalized_birth_date"
      ON "users" (LOWER(TRIM("name")), "birth_date")
      WHERE "birth_date" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_users_name_normalized_birth_date"`,
    );
  }
}
