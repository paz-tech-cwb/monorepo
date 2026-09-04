import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLifeGroupStudies1788520164937
  implements MigrationInterface
{
  name = 'CreateLifeGroupStudies1788520164937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "life_group_studies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "image_url" varchar(500),
        "title" varchar(255) NOT NULL,
        "author" varchar(255) NOT NULL,
        "body_markdown" text NOT NULL,
        "published_by_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_life_group_studies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_life_group_studies_published_by" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_life_group_studies_published_by_id"
      ON "life_group_studies" ("published_by_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "life_group_study_publishers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" integer NOT NULL,
        "granted_by_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_life_group_study_publishers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_life_group_study_publishers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_life_group_study_publishers_granted_by" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_life_group_study_publishers_user_id"
      ON "life_group_study_publishers" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_life_group_study_publishers_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "life_group_study_publishers"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_life_group_studies_published_by_id"`,
    );
    await queryRunner.query(`DROP TABLE "life_group_studies"`);
  }
}
