import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeMembersIntoUsers1757250000018
  implements MigrationInterface
{
  name = 'MergeMembersIntoUsers1757250000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add sector_id to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "sectorId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_sector"
      FOREIGN KEY ("sectorId")
      REFERENCES "sectors"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    // 2. Change life_group from varchar to foreign key
    // First, drop the old life_group column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "life_group"
    `);

    // Add the new lifeGroupId column
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "lifeGroupId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_life_group"
      FOREIGN KEY ("lifeGroupId")
      REFERENCES "life_groups"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    // 3. Create user_courses join table
    await queryRunner.query(`
      CREATE TABLE "user_courses" (
        "user_id" integer NOT NULL,
        "course_id" uuid NOT NULL,
        CONSTRAINT "PK_user_courses" PRIMARY KEY ("user_id", "course_id"),
        CONSTRAINT "FK_user_courses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_user_courses_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_courses_user" ON "user_courses" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_courses_course" ON "user_courses" ("course_id")
    `);

    // 4. Drop member_courses join table if it exists
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_member_courses_course"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_member_courses_member"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "member_courses"`);

    // 5. Drop members table
    await queryRunner.query(`DROP TABLE IF EXISTS "members"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate members table
    await queryRunner.query(`
      CREATE TABLE "members" (
        "id" SERIAL NOT NULL,
        "full_name" character varying(255) NOT NULL,
        "birthday_date" date,
        "cellphone" character varying(20),
        "address" character varying(500),
        "leader_name" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "sectorId" integer,
        "lifeGroupId" integer,
        CONSTRAINT "PK_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_members_sector" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_members_life_group" FOREIGN KEY ("lifeGroupId") REFERENCES "life_groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // Recreate member_courses table
    await queryRunner.query(`
      CREATE TABLE "member_courses" (
        "member_id" integer NOT NULL,
        "course_id" uuid NOT NULL,
        CONSTRAINT "PK_member_courses" PRIMARY KEY ("member_id", "course_id"),
        CONSTRAINT "FK_member_courses_member" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_member_courses_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_member_courses_member" ON "member_courses" ("member_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_member_courses_course" ON "member_courses" ("course_id")
    `);

    // Drop user_courses table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_courses_course"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_courses_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_courses"`);

    // Remove lifeGroupId from users
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "FK_users_life_group"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "lifeGroupId"
    `);

    // Recreate old life_group varchar column
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "life_group" character varying(255)
    `);

    // Remove sectorId from users
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "FK_users_sector"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "sectorId"
    `);
  }
}
