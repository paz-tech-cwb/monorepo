import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChurch1757250000006 implements MigrationInterface {
  name = 'CreateChurch1757250000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "church" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "address" jsonb NOT NULL DEFAULT '{}',
        "contact" jsonb NOT NULL DEFAULT '{}',
        "schedule" jsonb NOT NULL DEFAULT '{}',
        "social_media" jsonb NOT NULL DEFAULT '{}',
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_church" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "church" ("name", "address", "contact", "schedule", "social_media")
      VALUES (
        'Igreja Paz Curitiba',
        '{"street":"","number":"","neighborhood":"","city":"Curitiba","state":"PR","zip_code":"","country":"Brasil","complement":null,"reference":null}',
        '{"phone":"","email":"","website":""}',
        '{"sunday":{},"wednesday":{},"friday":{},"saturday":{}}',
        '{}'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "church"`);
  }
}
