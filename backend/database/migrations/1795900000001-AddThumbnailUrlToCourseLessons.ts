import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThumbnailUrlToCourseLessons1795900000001
  implements MigrationInterface
{
  name = 'AddThumbnailUrlToCourseLessons1795900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "thumbnail_url" text NULL
    `);

    await queryRunner.query(`
      UPDATE "course_lessons" SET "thumbnail_url" = 'https://img.youtube.com/vi/' || "youtube_video_id" || '/hqdefault.jpg' WHERE "thumbnail_url" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_lessons" DROP COLUMN IF EXISTS "thumbnail_url"
    `);
  }
}
