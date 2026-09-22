import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGuestOrigins1795800000004 implements MigrationInterface {
  name = 'CreateGuestOrigins1795800000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "guest_origins" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" int NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "origin_type" varchar(20) NOT NULL CHECK ("origin_type" IN ('casa_de_paz', 'invited_by_member', 'self')),
        "casa_de_paz_id" uuid REFERENCES "casa_de_paz_cycles"("id"),
        "invited_by_user_id" int REFERENCES "users"("id"),
        "invited_by_text" varchar(180),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_guest_origins_casa_de_paz_id" ON "guest_origins" ("casa_de_paz_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_guest_origins_casa_de_paz_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "guest_origins"`);
  }
}
