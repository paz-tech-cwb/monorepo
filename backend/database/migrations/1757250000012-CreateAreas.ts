import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAreas1757250000012 implements MigrationInterface {
  name = 'CreateAreas1757250000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "areas" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_areas" PRIMARY KEY ("id")
      )
    `);

    // Insert default areas
    await queryRunner.query(`
      INSERT INTO "areas" ("name") VALUES
        ('Alan e Pri'),
        ('Antonio e Fran'),
        ('Eriel e Tainara'),
        ('Prs. Jackson e Meila')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "areas"`);
  }
}
