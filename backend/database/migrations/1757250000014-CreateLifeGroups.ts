import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLifeGroups1757250000014 implements MigrationInterface {
  name = 'CreateLifeGroups1757250000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "life_groups" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "location" character varying(255),
        "meeting_day" character varying(50),
        "meeting_time" time,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "leaderId" integer,
        "sectorId" integer,
        CONSTRAINT "PK_life_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_life_groups_leader" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_life_groups_sector" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "life_groups"`);
  }
}
