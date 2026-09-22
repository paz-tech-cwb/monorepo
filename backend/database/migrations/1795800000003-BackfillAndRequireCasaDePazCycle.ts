import { MigrationInterface, QueryRunner } from 'typeorm';

// Auto-creates one casa_de_paz_cycles row per distinct historical month
// found in casa_de_paz_reports.date, backfills old rows to point at them,
// then enforces NOT NULL. Historical cycles are created as 'closed' since
// they represent already-completed months. Written as a single raw-SQL
// script (not TypeORM query builder) so the whole backfill is one
// auditable, reviewable statement set.
export class BackfillAndRequireCasaDePazCycle1795800000003
  implements MigrationInterface
{
  name = 'BackfillAndRequireCasaDePazCycle1795800000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pick an arbitrary "system" actor to attribute historically-invented
    // cycles to (created_by_id is NOT NULL) — the earliest admin/pastor
    // user, or otherwise the earliest user in the table.
    const actorRow = (await queryRunner.query(`
      SELECT u.id FROM "users" u
      LEFT JOIN "roles" r ON r.id = u.role_id
      ORDER BY (r.slug IN ('admin', 'pastor')) DESC, u.id ASC
      LIMIT 1
    `)) as Array<{ id: number }>;
    const actorId: number | undefined = actorRow[0]?.id;
    if (!actorId) {
      // No users at all (e.g. a fresh/empty database) — nothing to
      // backfill, and the NOT NULL constraint is safe to add directly.
      await queryRunner.query(`
        ALTER TABLE "casa_de_paz_reports"
        ALTER COLUMN "casa_de_paz_id" SET NOT NULL
      `);
      return;
    }

    // Month names are built with an explicit CASE mapping (not
    // to_char(..., 'TMMonth')) to match casa-de-paz-cycles.service.ts's
    // monthNameFor(), which always emits pt-BR labels regardless of server
    // locale — to_char's month name is locale-dependent and could emit
    // English names on a non-pt_BR cluster.
    await queryRunner.query(
      `
      INSERT INTO "casa_de_paz_cycles" ("month", "name", "status", "created_by_id")
      SELECT
        DISTINCT date_trunc('month', r.date)::date AS month,
        'Casa de Paz — ' || (CASE EXTRACT(MONTH FROM r.date)
          WHEN 1 THEN 'Janeiro'
          WHEN 2 THEN 'Fevereiro'
          WHEN 3 THEN 'Março'
          WHEN 4 THEN 'Abril'
          WHEN 5 THEN 'Maio'
          WHEN 6 THEN 'Junho'
          WHEN 7 THEN 'Julho'
          WHEN 8 THEN 'Agosto'
          WHEN 9 THEN 'Setembro'
          WHEN 10 THEN 'Outubro'
          WHEN 11 THEN 'Novembro'
          WHEN 12 THEN 'Dezembro'
        END) || ' ' || to_char(r.date, 'YYYY') AS name,
        'closed' AS status,
        $1 AS created_by_id
      FROM "casa_de_paz_reports" r
      WHERE r.casa_de_paz_id IS NULL
      ON CONFLICT ("month") DO NOTHING
      `,
      [actorId],
    );

    await queryRunner.query(`
      UPDATE "casa_de_paz_reports" r
      SET "casa_de_paz_id" = c.id
      FROM "casa_de_paz_cycles" c
      WHERE r."casa_de_paz_id" IS NULL
        AND c."month" = date_trunc('month', r."date")::date
    `);

    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_reports"
      ALTER COLUMN "casa_de_paz_id" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentional: we leave the backfilled cycles and their links to
    // casa_de_paz_reports in place on rollback. A full reversal would mean
    // deleting invented cycle rows, which isn't meaningful data to
    // "undo" — the NOT NULL relaxation below is the only structural change
    // reversed.
    await queryRunner.query(`
      ALTER TABLE "casa_de_paz_reports"
      ALTER COLUMN "casa_de_paz_id" DROP NOT NULL
    `);
  }
}
