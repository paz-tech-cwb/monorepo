// backend/database/migrations/1757250000019-LifeGroupsManyToMany.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class LifeGroupsManyToMany1757250000019 implements MigrationInterface {
  name = 'LifeGroupsManyToMany1757250000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop FK constraint and column from users
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP CONSTRAINT IF EXISTS "FK_users_life_group"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "lifeGroupId"
    `);

    // 2. Create many-to-many join table
    await queryRunner.query(`
      CREATE TABLE "user_life_groups" (
        "user_id" integer NOT NULL,
        "life_group_id" integer NOT NULL,
        CONSTRAINT "PK_user_life_groups" PRIMARY KEY ("user_id", "life_group_id"),
        CONSTRAINT "FK_user_life_groups_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_life_groups_life_group"
          FOREIGN KEY ("life_group_id") REFERENCES "life_groups"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_life_groups_user" ON "user_life_groups" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_life_groups_life_group" ON "user_life_groups" ("life_group_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_life_groups_life_group"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_life_groups_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_life_groups"`);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "lifeGroupId" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_life_group"
        FOREIGN KEY ("lifeGroupId") REFERENCES "life_groups"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }
}
