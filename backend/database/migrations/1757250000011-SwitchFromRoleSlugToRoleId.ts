import { MigrationInterface, QueryRunner } from 'typeorm';

export class SwitchFromRoleSlugToRoleId1757250000011
  implements MigrationInterface
{
  name = 'SwitchFromRoleSlugToRoleId1757250000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add slug column to roles table
    await queryRunner.query(`
      ALTER TABLE "roles"
        ADD COLUMN IF NOT EXISTS "slug" character varying(50)
    `);

    // Step 2: Populate slug column based on name
    await queryRunner.query(`
      UPDATE "roles"
      SET "slug" = "name"
      WHERE "slug" IS NULL
    `);

    // Step 3: Make slug NOT NULL and UNIQUE
    await queryRunner.query(`
      ALTER TABLE "roles"
        ALTER COLUMN "slug" SET NOT NULL,
        ADD CONSTRAINT "UQ_roles_slug" UNIQUE ("slug")
    `);

    // Step 4: Add role_id column to users table (nullable initially)
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "role_id" integer
    `);

    // Step 5: Create FK constraint from users.role_id to roles.id
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_role_id"
        FOREIGN KEY ("role_id") REFERENCES "roles"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE
    `);

    // Step 6: Backfill role_id from role_slug by matching roles.slug
    await queryRunner.query(`
      UPDATE "users" u
      SET "role_id" = r.id
      FROM "roles" r
      WHERE u."role_slug" = r."slug"
        AND u."role_id" IS NULL
    `);

    // Step 7: Set default role_id to 6 (member) for any users still without a role
    await queryRunner.query(`
      UPDATE "users"
      SET "role_id" = (SELECT id FROM "roles" WHERE "slug" = 'member' LIMIT 1)
      WHERE "role_id" IS NULL
    `);

    // Step 8: Make role_id NOT NULL
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "role_id" SET NOT NULL
    `);

    // Step 9: Drop the old role_slug column
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "role_slug"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse Step 9: Re-add role_slug column
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "role_slug" character varying(50)
    `);

    // Reverse Step 8 & 7 & 6: Backfill role_slug from role_id
    await queryRunner.query(`
      UPDATE "users" u
      SET "role_slug" = r."slug"
      FROM "roles" r
      WHERE u."role_id" = r.id
        AND u."role_slug" IS NULL
    `);

    // Set default for any missing values
    await queryRunner.query(`
      UPDATE "users"
      SET "role_slug" = 'member'
      WHERE "role_slug" IS NULL
    `);

    // Make role_slug NOT NULL with default
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "role_slug" SET NOT NULL,
        ALTER COLUMN "role_slug" SET DEFAULT 'member'
    `);

    // Reverse Step 5: Drop FK constraint
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP CONSTRAINT IF EXISTS "FK_users_role_id"
    `);

    // Reverse Step 4: Drop role_id column
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "role_id"
    `);

    // Reverse Step 3: Drop unique constraint on slug
    await queryRunner.query(`
      ALTER TABLE "roles"
        DROP CONSTRAINT IF EXISTS "UQ_roles_slug"
    `);

    // Reverse Step 1: Drop slug column
    await queryRunner.query(`
      ALTER TABLE "roles"
        DROP COLUMN IF EXISTS "slug"
    `);
  }
}
