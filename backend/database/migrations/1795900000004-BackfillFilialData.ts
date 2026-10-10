import { MigrationInterface, QueryRunner } from 'typeorm';

// Stage 2 of the filial rollout: backfills every existing row in the four
// scoped tables, plus every existing user, to point at the single
// pre-existing church row. Mirrors the "id=1 singleton" assumption the old
// ChurchService hardcoded — if that row is somehow missing (fresh/empty DB),
// one is created so the backfill always has a target.
export class BackfillFilialData1795900000004 implements MigrationInterface {
  name = 'BackfillFilialData1795900000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = (await queryRunner.query(`
      SELECT id FROM "church" ORDER BY id ASC LIMIT 1
    `)) as Array<{ id: number }>;

    let churchId: number;
    if (existing[0]?.id) {
      churchId = existing[0].id;
    } else {
      const inserted = (await queryRunner.query(`
        INSERT INTO "church" ("name", "address", "contact", "schedule", "social_media")
        VALUES ('Igreja Paz Curitiba', '{}', '{}', '{}', '{}')
        RETURNING id
      `)) as Array<{ id: number }>;
      churchId = inserted[0].id;
    }

    await queryRunner.query(
      `UPDATE "areas" SET "church_id" = $1 WHERE "church_id" IS NULL`,
      [churchId],
    );
    await queryRunner.query(
      `UPDATE "events" SET "church_id" = $1 WHERE "church_id" IS NULL`,
      [churchId],
    );
    await queryRunner.query(
      `UPDATE "announcements" SET "church_id" = $1 WHERE "church_id" IS NULL`,
      [churchId],
    );
    await queryRunner.query(
      `UPDATE "casa_de_paz_cycles" SET "church_id" = $1 WHERE "church_id" IS NULL`,
      [churchId],
    );

    // Every existing user gets a primary association with the sole filial.
    await queryRunner.query(
      `
      INSERT INTO "user_churches" ("user_id", "church_id", "is_primary")
      SELECT u.id, $1, true
      FROM "users" u
      WHERE NOT EXISTS (
        SELECT 1 FROM "user_churches" uc
        WHERE uc."user_id" = u.id AND uc."church_id" = $1
      )
      `,
      [churchId],
    );
  }

  public async down(): Promise<void> {
    // Intentional no-op: reversing a data backfill (re-nulling church_id,
    // deleting invented user_churches rows) isn't meaningful to "undo" —
    // the structural changes this depends on are reversed by
    // 1795900000003's down() when that migration is also rolled back.
  }
}
