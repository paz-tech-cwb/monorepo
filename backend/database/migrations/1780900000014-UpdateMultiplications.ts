import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMultiplications1780900000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = '"multiplications"';
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "area_id"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "sector_id"`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "area" varchar(255)`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "sector" varchar(255)`);
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN "legally_married" DROP NOT NULL`);
    for (const prefix of ['new_lg', 'old_lg']) {
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_name" varchar(255)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_leader" varchar(180)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_host" varchar(180)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_address" text`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_leader_phone" varchar(32)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_meeting_day_time" varchar(100)`);
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS "${prefix}_members" text[] DEFAULT '{}'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = '"multiplications"';
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "area"`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "sector"`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN "area_id" int`);
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN "sector_id" int`);
    for (const prefix of ['new_lg', 'old_lg']) {
      for (const col of ['name', 'leader', 'host', 'address', 'leader_phone', 'meeting_day_time', 'members']) {
        await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS "${prefix}_${col}"`);
      }
    }
  }
}
