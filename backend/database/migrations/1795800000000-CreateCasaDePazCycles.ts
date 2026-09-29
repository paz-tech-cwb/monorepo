import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCasaDePazCycles1795800000000 implements MigrationInterface {
  name = 'CreateCasaDePazCycles1795800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "casa_de_paz_cycles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "month" date NOT NULL,
        "name" varchar(120) NOT NULL,
        "status" varchar(10) NOT NULL DEFAULT 'open',
        "closed_at" timestamptz,
        "created_by_id" int NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_casa_de_paz_cycles_month" ON "casa_de_paz_cycles" ("month")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_casa_de_paz_cycles_month"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "casa_de_paz_cycles"`);
  }
}
