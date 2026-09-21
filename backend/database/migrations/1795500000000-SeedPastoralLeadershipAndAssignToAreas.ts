import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPastoralLeadershipAndAssignToAreas1795500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const pastorRole = (await queryRunner.query(`
      SELECT "id" FROM "roles" WHERE "slug" = 'pastor'
    `)) as Array<{ id: number }>;
    if (pastorRole.length === 0) {
      throw new Error(
        "Cannot seed pastoral leadership: no role with slug 'pastor' found. Run role seed migrations first.",
      );
    }

    // Insert Jackson Mendes (pastor) if a pastor with that exact name doesn't exist yet.
    await queryRunner.query(`
      INSERT INTO "users" ("name", "role_id", "created_at", "updated_at")
      SELECT 'Jackson Mendes', r."id", now(), now()
      FROM "roles" r
      WHERE r."slug" = 'pastor'
        AND NOT EXISTS (
          SELECT 1 FROM "users" u
          WHERE u."name" = 'Jackson Mendes'
            AND u."role_id" = (SELECT id FROM "roles" WHERE slug = 'pastor')
        )
    `);

    // Insert Meila Conceição (pastor) if a pastor with that exact name doesn't exist yet.
    await queryRunner.query(`
      INSERT INTO "users" ("name", "role_id", "created_at", "updated_at")
      SELECT 'Meila Conceição', r."id", now(), now()
      FROM "roles" r
      WHERE r."slug" = 'pastor'
        AND NOT EXISTS (
          SELECT 1 FROM "users" u
          WHERE u."name" = 'Meila Conceição'
            AND u."role_id" = (SELECT id FROM "roles" WHERE slug = 'pastor')
        )
    `);

    // Assign the joint pastoral leadership pairing to every area that
    // doesn't already have a pastor assigned. Idempotent and non-destructive
    // to any manual reassignment made after this migration runs.
    // Ids are resolved by the same role+name predicate used for the
    // existence checks above, with deterministic ordering in case of
    // homonyms, so we never silently attach every area to an unrelated
    // same-named non-pastor user.
    await queryRunner.query(`
      UPDATE "areas"
      SET
        "pastor_id" = (
          SELECT "id" FROM "users"
          WHERE "name" = 'Jackson Mendes'
            AND "role_id" = (SELECT id FROM "roles" WHERE slug = 'pastor')
          ORDER BY "id"
          LIMIT 1
        ),
        "co_pastor_id" = (
          SELECT "id" FROM "users"
          WHERE "name" = 'Meila Conceição'
            AND "role_id" = (SELECT id FROM "roles" WHERE slug = 'pastor')
          ORDER BY "id"
          LIMIT 1
        )
      WHERE "pastor_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Null out the fields this migration set, but only for areas still
    // pointing at the seeded pastoral pairing (don't clobber manual reassignments).
    // Ids are resolved with the same role-scoped, deterministic lookup as up().
    await queryRunner.query(`
      UPDATE "areas"
      SET "pastor_id" = NULL, "co_pastor_id" = NULL
      WHERE "pastor_id" = (
        SELECT "id" FROM "users"
        WHERE "name" = 'Jackson Mendes'
          AND "role_id" = (SELECT id FROM "roles" WHERE slug = 'pastor')
        ORDER BY "id"
        LIMIT 1
      )
        AND "co_pastor_id" = (
          SELECT "id" FROM "users"
          WHERE "name" = 'Meila Conceição'
            AND "role_id" = (SELECT id FROM "roles" WHERE slug = 'pastor')
          ORDER BY "id"
          LIMIT 1
        )
    `);

    // Only delete the seeded pastor users if nothing else references them anymore.
    await queryRunner.query(`
      DELETE FROM "users" u
      WHERE u."name" = 'Jackson Mendes'
        AND u."role_id" = (SELECT id FROM "roles" WHERE slug = 'pastor')
        AND NOT EXISTS (SELECT 1 FROM "areas" WHERE "pastor_id" = u."id" OR "co_pastor_id" = u."id")
        AND NOT EXISTS (SELECT 1 FROM "sectors" WHERE "leader_id" = u."id" OR "co_leader_id" = u."id")
        AND NOT EXISTS (SELECT 1 FROM "life_groups" WHERE "leader_id" = u."id" OR "co_leader_id" = u."id")
    `);

    await queryRunner.query(`
      DELETE FROM "users" u
      WHERE u."name" = 'Meila Conceição'
        AND u."role_id" = (SELECT id FROM "roles" WHERE slug = 'pastor')
        AND NOT EXISTS (SELECT 1 FROM "areas" WHERE "pastor_id" = u."id" OR "co_pastor_id" = u."id")
        AND NOT EXISTS (SELECT 1 FROM "sectors" WHERE "leader_id" = u."id" OR "co_leader_id" = u."id")
        AND NOT EXISTS (SELECT 1 FROM "life_groups" WHERE "leader_id" = u."id" OR "co_leader_id" = u."id")
    `);
  }
}
