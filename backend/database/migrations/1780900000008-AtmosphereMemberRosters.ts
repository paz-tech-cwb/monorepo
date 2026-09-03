import { MigrationInterface, QueryRunner } from 'typeorm';

export class AtmosphereMemberRosters1780900000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "atmosphere_ministry_members" (
        "ministry_id" int NOT NULL REFERENCES "atmosphere_ministries"("id") ON DELETE CASCADE,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("ministry_id", "user_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "atmosphere_team_members" (
        "team_id" int NOT NULL REFERENCES "atmosphere_teams"("id") ON DELETE CASCADE,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        PRIMARY KEY ("team_id", "user_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "atmosphere_team_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "atmosphere_ministry_members"`);
  }
}
