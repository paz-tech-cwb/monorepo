import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStatusAndRoleSlug1757250000002
  implements MigrationInterface
{
  name = 'AddUserStatusAndRoleSlug1757250000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "role_slug" character varying(50),
        ADD COLUMN IF NOT EXISTS "life_group" character varying(255),
        ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "membership_date" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "role_slug",
        DROP COLUMN IF EXISTS "life_group",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "membership_date"
    `);
  }
}
