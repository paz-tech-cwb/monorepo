import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeepLinkToNotifications1780900000005
  implements MigrationInterface
{
  name = 'AddDeepLinkToNotifications1780900000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN "deep_link" varchar(500) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "deep_link"`,
    );
  }
}
