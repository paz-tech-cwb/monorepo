import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecipientsByChannelToNotifications1780800000002
  implements MigrationInterface
{
  name = 'AddRecipientsByChannelToNotifications1780800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipients_by_channel" jsonb NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "recipients_by_channel"`,
    );
  }
}
