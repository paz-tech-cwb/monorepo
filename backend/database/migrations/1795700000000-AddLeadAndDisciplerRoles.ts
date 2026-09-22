import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeadAndDisciplerRoles1795700000000
  implements MigrationInterface
{
  name = 'AddLeadAndDisciplerRoles1795700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "slug") VALUES
        ('Lead', 'lead'),
        ('Discipulador', 'discipler')
      ON CONFLICT ("slug") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // users.role_id is a NOT NULL FK — reassign any users on these roles
    // back to 'member' before deleting the role rows, or the delete would
    // either fail (default FK behavior) or orphan those users.
    await queryRunner.query(`
      UPDATE "users"
      SET "role_id" = (SELECT "id" FROM "roles" WHERE "slug" = 'member')
      WHERE "role_id" IN (
        SELECT "id" FROM "roles" WHERE "slug" IN ('lead', 'discipler')
      )
    `);
    await queryRunner.query(
      `DELETE FROM "roles" WHERE "slug" IN ('lead', 'discipler')`,
    );
  }
}
