import { MigrationInterface, QueryRunner } from 'typeorm';

export class AtmosferaAndServiceReportRedesign1780900000007
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Atmosphere ministries
    await queryRunner.query(`
      CREATE TABLE "atmosphere_ministries" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(180) NOT NULL,
        "leader_id" int,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Atmosphere teams
    await queryRunner.query(`
      CREATE TABLE "atmosphere_teams" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(180) NOT NULL,
        "ministry_id" int NOT NULL REFERENCES "atmosphere_ministries"("id") ON DELETE CASCADE,
        "leader_id" int,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Seed new roles
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "slug") VALUES
        ('Líder do Ministério Atmosfera', 'atmosphere_ministry_leader'),
        ('Líder de Equipe Atmosfera', 'atmosphere_team_leader')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // Drop old service_reports and recreate with ATM schema
    await queryRunner.query(`DROP TABLE IF EXISTS "service_reports" CASCADE`);
    await queryRunner.query(`
      CREATE TABLE "service_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        "date" date NOT NULL,
        "report_type" varchar(30) NOT NULL,
        "period" varchar(20) NOT NULL,
        "atmosphere_team_id" int REFERENCES "atmosphere_teams"("id") ON DELETE SET NULL,
        "atmosphere_team_other" varchar(180),
        "atmosphere_responsible" varchar(180) NOT NULL,
        "tadel_adults" int NOT NULL DEFAULT 0,
        "tadel_kids" int NOT NULL DEFAULT 0,
        "vehicles_cars" int NOT NULL DEFAULT 0,
        "vehicles_motos" int NOT NULL DEFAULT 0,
        "vehicles_bikes" int NOT NULL DEFAULT 0,
        "vehicles_others" varchar(255),
        "volunteers_atmosfera" int NOT NULL DEFAULT 0,
        "volunteers_louvor" int NOT NULL DEFAULT 0,
        "volunteers_midia" int NOT NULL DEFAULT 0,
        "volunteers_danca" int NOT NULL DEFAULT 0,
        "notes" text,
        "submitted_by_id" int NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "service_reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "atmosphere_teams" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "atmosphere_ministries" CASCADE`);
    await queryRunner.query(`DELETE FROM "roles" WHERE slug IN ('atmosphere_ministry_leader','atmosphere_team_leader')`);
  }
}
