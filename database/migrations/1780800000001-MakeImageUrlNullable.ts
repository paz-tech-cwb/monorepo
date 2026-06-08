import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeImageUrlNullable1780800000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
        ALTER COLUMN "image_url" DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
        ALTER COLUMN "image_url" SET NOT NULL;
    `);
  }
}
