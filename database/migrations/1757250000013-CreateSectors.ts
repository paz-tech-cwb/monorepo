import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSectors1757250000013 implements MigrationInterface {
  name = 'CreateSectors1757250000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sectors" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sectors" PRIMARY KEY ("id")
      )
    `);

    // Insert default sectors
    await queryRunner.query(`
      INSERT INTO "sectors" ("name") VALUES
        ('Pedro e Fernanda'),
        ('Robby e Michelle')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sectors"`);
  }
}
