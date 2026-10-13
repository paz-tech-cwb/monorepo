import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsExtraToLifeGroupAttendance1796000000001
  implements MigrationInterface
{
  name = 'AddIsExtraToLifeGroupAttendance1796000000001';

  // Marks meetings explicitly flagged as "extra" (held on a weekday other than
  // the group's fixed meeting_day). Every existing row is a regular meeting
  // (default false); no data is rewritten.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE life_group_attendance
        ADD COLUMN IF NOT EXISTS is_extra boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE life_group_attendance DROP COLUMN IF EXISTS is_extra
    `);
  }
}
