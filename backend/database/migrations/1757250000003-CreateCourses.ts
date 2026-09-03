import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourses1757250000003 implements MigrationInterface {
  name = 'CreateCourses1757250000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "courses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "creator" character varying(255) NOT NULL,
        "creator_id" character varying(255),
        "estimated_hours" integer NOT NULL,
        "category" character varying(50) NOT NULL,
        "url" character varying(500),
        "image_url" character varying(500),
        "thumbnail_url" character varying(500),
        "status" character varying(20) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_courses" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "courses"`);
  }
}
