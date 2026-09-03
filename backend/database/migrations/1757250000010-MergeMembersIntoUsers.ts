import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeMembersIntoUsers1757250000010 implements MigrationInterface {
  name = 'MergeMembersIntoUsers1757250000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ----------------------------------------------------------------
    // 1. Backfill role_slug = 'member' for any existing users that have
    //    no role yet (rows created by social login before this migration).
    // ----------------------------------------------------------------
    await queryRunner.query(`
      UPDATE "users"
        SET "role_slug" = 'member'
        WHERE "role_slug" IS NULL
    `);

    // ----------------------------------------------------------------
    // 2. Make role_slug NOT NULL with default 'member'.
    // ----------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "role_slug" SET NOT NULL,
        ALTER COLUMN "role_slug" SET DEFAULT 'member'
    `);

    // ----------------------------------------------------------------
    // 3. Insert orphan members (emails not present in users) into users.
    //    For members that have a non-null address string, first create
    //    a row in the addresses table, then link it via address_id.
    //    Members without an address are inserted with address_id = NULL.
    // ----------------------------------------------------------------

    // 3a. Orphan members WITHOUT an address value.
    await queryRunner.query(`
      INSERT INTO "users" (
        "name", "email", "phone_number",
        "birth_date", "life_group", "status", "membership_date",
        "role_slug", "created_at", "updated_at"
      )
      SELECT
        m."name",
        m."email",
        m."phone",
        m."birth_date",
        m."life_group",
        m."status",
        m."membership_date",
        'member',
        m."created_at",
        m."updated_at"
      FROM "members" m
      WHERE
        NOT EXISTS (
          SELECT 1 FROM "users" u
          WHERE LOWER(u."email") = LOWER(m."email")
        )
        AND (m."address" IS NULL OR TRIM(m."address") = '')
    `);

    // 3b. Orphan members WITH an address value — insert address row first,
    //     then insert the user row referencing the new address id.
    //     The addresses table requires: street, city, state, country, zipCode.
    //     We store the raw address string in "street" and use placeholder values
    //     for the remaining required columns since members only stored free text.
    await queryRunner.query(`
      WITH inserted_addresses AS (
        INSERT INTO "addresses" ("street", "city", "state", "country", "zipCode")  -- zipCode is the actual column name (no snake_case mapping in Address entity)
        SELECT
          m."address",
          '',
          '',
          '',
          ''
        FROM "members" m
        WHERE
          NOT EXISTS (
            SELECT 1 FROM "users" u
            WHERE LOWER(u."email") = LOWER(m."email")
          )
          AND m."address" IS NOT NULL
          AND TRIM(m."address") <> ''
        RETURNING "id", "street"
      ),
      member_with_addr AS (
        SELECT
          m."name",
          m."email",
          m."phone",
          m."birth_date",
          m."life_group",
          m."status",
          m."membership_date",
          m."created_at",
          m."updated_at",
          ia."id" AS addr_id
        FROM "members" m
        JOIN inserted_addresses ia ON ia."street" = m."address"
        WHERE
          NOT EXISTS (
            SELECT 1 FROM "users" u
            WHERE LOWER(u."email") = LOWER(m."email")
          )
          AND m."address" IS NOT NULL
          AND TRIM(m."address") <> ''
      )
      INSERT INTO "users" (
        "name", "email", "phone_number",
        "birth_date", "life_group", "status", "membership_date",
        "role_slug", "addressId", "created_at", "updated_at"
      )
      SELECT
        mwa."name",
        mwa."email",
        mwa."phone",
        mwa."birth_date",
        mwa."life_group",
        mwa."status",
        mwa."membership_date",
        'member',
        mwa.addr_id,
        mwa."created_at",
        mwa."updated_at"
      FROM member_with_addr mwa
    `);

    // ----------------------------------------------------------------
    // 4. Backfill profile data on existing matched users from members.
    //    Only fills columns that are currently NULL on the user row.
    // ----------------------------------------------------------------
    await queryRunner.query(`
      UPDATE "users" u
      SET
        "membership_date" = COALESCE(u."membership_date", m."membership_date"),
        "life_group"      = COALESCE(u."life_group",      m."life_group"),
        "phone_number"    = COALESCE(u."phone_number",    m."phone")
      FROM "members" m
      WHERE LOWER(u."email") = LOWER(m."email")
    `);

    // ----------------------------------------------------------------
    // 5. Re-point member_journey_stages.member_id FK → users.id
    //    by resolving through the members.email → users.email join.
    // ----------------------------------------------------------------

    // 5a. Add a temporary column to hold the new user id.
    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        ADD COLUMN IF NOT EXISTS "_new_user_id" integer
    `);

    // 5b. Populate it by joining members → users on email.
    await queryRunner.query(`
      UPDATE "member_journey_stages" mjs
      SET "_new_user_id" = u."id"
      FROM "members" m
      JOIN "users" u ON LOWER(u."email") = LOWER(m."email")
      WHERE mjs."member_id" = m."id"
    `);

    // 5c. Delete any orphaned journey rows that could not be resolved
    //     (should be zero after step 3, but guard against corrupt data).
    await queryRunner.query(`
      DELETE FROM "member_journey_stages" WHERE "_new_user_id" IS NULL
    `);

    // 5d. Drop the old FK constraint on member_id.
    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        DROP CONSTRAINT IF EXISTS "FK_member_journey_stages_member_id"
    `);

    // 5e. Drop the old member_id column.
    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        DROP COLUMN "member_id"
    `);

    // 5f. Rename the temporary column to member_id (keeps API/column name stable).
    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        RENAME COLUMN "_new_user_id" TO "member_id"
    `);

    // 5g. Set NOT NULL.
    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        ALTER COLUMN "member_id" SET NOT NULL
    `);

    // 5h. Add the new FK pointing to users.id with CASCADE delete.
    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        ADD CONSTRAINT "FK_member_journey_stages_user_id"
        FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // ----------------------------------------------------------------
    // 6. Drop the members table — it is now fully absorbed into users.
    // ----------------------------------------------------------------
    await queryRunner.query(`DROP TABLE "members"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ----------------------------------------------------------------
    // Recreate the members table and restore it from users.
    // NOTE: address data written to the addresses table during up() is
    // not removed here because other users may share those address rows.
    // A full rollback would require a data backup taken before running up().
    // ----------------------------------------------------------------

    await queryRunner.query(`
      CREATE TABLE "members" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(20),
        "address" character varying(500),
        "birth_date" date,
        "life_group" character varying(255),
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "membership_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_members_email" UNIQUE ("email"),
        CONSTRAINT "PK_members" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "members" ("name", "email", "phone", "birth_date", "life_group", "status", "membership_date", "created_at", "updated_at")
      SELECT "name", "email", "phone_number", "birth_date", "life_group", "status", "membership_date", "created_at", "updated_at"
      FROM "users"
      WHERE "email" IS NOT NULL
    `);

    // Re-point member_journey_stages back to members.id via email join.
    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        ADD COLUMN IF NOT EXISTS "_old_member_id" integer
    `);

    await queryRunner.query(`
      UPDATE "member_journey_stages" mjs
      SET "_old_member_id" = m."id"
      FROM "users" u
      JOIN "members" m ON LOWER(m."email") = LOWER(u."email")
      WHERE mjs."member_id" = u."id"
    `);

    await queryRunner.query(`
      DELETE FROM "member_journey_stages" WHERE "_old_member_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        DROP CONSTRAINT IF EXISTS "FK_member_journey_stages_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        DROP COLUMN "member_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        RENAME COLUMN "_old_member_id" TO "member_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        ALTER COLUMN "member_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        ADD CONSTRAINT "FK_member_journey_stages_member_id"
        FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE
    `);

    // Revert role_slug column constraints.
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "role_slug" DROP NOT NULL,
        ALTER COLUMN "role_slug" DROP DEFAULT
    `);
  }
}
