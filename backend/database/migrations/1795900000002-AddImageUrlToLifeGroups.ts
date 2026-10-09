import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageUrlToLifeGroups1795900000002
  implements MigrationInterface
{
  name = 'AddImageUrlToLifeGroups1795900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "life_groups" ADD COLUMN IF NOT EXISTS "image_url" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "life_groups" DROP COLUMN IF EXISTS "image_url"
    `);
  }
}
