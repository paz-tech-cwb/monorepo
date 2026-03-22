import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserDeviceTokens1757250000021 implements MigrationInterface {
  name = 'CreateUserDeviceTokens1757250000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "device_platform_enum" AS ENUM ('android', 'ios')
    `);
    await queryRunner.query(`
      CREATE TABLE "user_device_tokens" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "token" varchar NOT NULL,
        "platform" "device_platform_enum" NOT NULL,
        "last_used_at" timestamp NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_device_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_user_device_tokens_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_device_tokens_user" ON "user_device_tokens" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_device_tokens_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_device_tokens"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "device_platform_enum"`);
  }
}
