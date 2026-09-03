import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginToNotifications1780900000001
  implements MigrationInterface
{
  name = 'AddOriginToNotifications1780900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_origin_enum') THEN
          CREATE TYPE "notification_origin_enum" AS ENUM ('manual', 'automatic');
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "origin" "notification_origin_enum" NOT NULL DEFAULT 'manual'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "origin"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_origin_enum"`);
  }
}
