import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceLinkToLifeGroupReports1796000000000
  implements MigrationInterface
{
  name = 'AddAttendanceLinkToLifeGroupReports1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Link a report to the attendance record of the same meeting.
    await queryRunner.query(`
      ALTER TABLE life_group_reports
        ADD COLUMN IF NOT EXISTS attendance_id uuid
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_life_group_reports_attendance'
            AND conrelid = 'life_group_reports'::regclass
        ) THEN
          ALTER TABLE life_group_reports
            ADD CONSTRAINT fk_life_group_reports_attendance
            FOREIGN KEY (attendance_id) REFERENCES life_group_attendance(id)
            ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lgr_attendance
        ON life_group_reports(attendance_id)
    `);

    // 2. Duplicate scan, then (only when clean) the partial unique index.
    // NOTHING is ever deleted or changed in life_group_reports here. When two
    // or more non-deleted reports share (life_group_id, date) the index is NOT
    // created and the migration still succeeds: the offending groups are
    // recorded in life_group_report_duplicate_findings (a snapshot of the
    // CURRENT duplicates, rebuilt on every run), a NOTICE is raised and a
    // warning is printed. Humans resolve them (soft-delete the extras), then
    // either re-run this migration (revert + run) or run the CREATE UNIQUE
    // INDEX statement documented in .ai/features/life-groups.md. The
    // application guards duplicates itself (advisory lock + find-then-upsert),
    // so an absent index is safe, just less strict.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS life_group_report_duplicate_findings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        life_group_id int NOT NULL,
        date date NOT NULL,
        report_ids uuid[] NOT NULL,
        report_count int NOT NULL,
        detected_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      DO $$
      DECLARE
        dup_count int;
        sample text;
      BEGIN
        DELETE FROM life_group_report_duplicate_findings;

        INSERT INTO life_group_report_duplicate_findings
          (life_group_id, date, report_ids, report_count)
        SELECT life_group_id, date, array_agg(id ORDER BY created_at, id),
               count(*)::int
        FROM life_group_reports
        WHERE deleted_at IS NULL
        GROUP BY life_group_id, date
        HAVING count(*) > 1;

        SELECT count(*) INTO dup_count
        FROM life_group_report_duplicate_findings;

        IF dup_count = 0 THEN
          CREATE UNIQUE INDEX IF NOT EXISTS uq_life_group_reports_group_date_active
            ON life_group_reports (life_group_id, date)
            WHERE deleted_at IS NULL;
        ELSE
          SELECT string_agg(
                   'life_group_id=' || life_group_id || ' date=' || date ||
                   ' reports=' || report_count,
                   '; ')
            INTO sample
          FROM (
            SELECT * FROM life_group_report_duplicate_findings
            ORDER BY detected_at, life_group_id, date LIMIT 5
          ) s;
          RAISE NOTICE 'life_group_reports: % duplicate (life_group_id, date) group(s); unique index NOT created. Sample: %',
            dup_count, sample;
        END IF;
      END $$
    `);

    const rows = (await queryRunner.query(
      `SELECT count(*)::text AS count FROM life_group_report_duplicate_findings`,
    )) as Array<{ count: string }>;
    const duplicates = Number(rows[0]?.count ?? 0);
    if (duplicates > 0) {
      console.warn(
        `[AddAttendanceLinkToLifeGroupReports] ${duplicates} duplicate (life_group_id, date) group(s) in life_group_reports: ` +
          'unique index uq_life_group_reports_group_date_active was NOT created. ' +
          'See table life_group_report_duplicate_findings, resolve them manually, then re-run.',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_life_group_reports_group_date_active`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lgr_attendance`);
    await queryRunner.query(`
      ALTER TABLE life_group_reports
        DROP CONSTRAINT IF EXISTS fk_life_group_reports_attendance
    `);
    await queryRunner.query(`
      ALTER TABLE life_group_reports
        DROP COLUMN IF EXISTS attendance_id
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS life_group_report_duplicate_findings`,
    );
  }
}
