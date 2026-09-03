import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMembers1757250000016 implements MigrationInterface {
  name = 'CreateMembers1757250000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_member_courses_course"`);
    await queryRunner.query(`DROP INDEX "IDX_member_courses_member"`);
    await queryRunner.query(`DROP TABLE "member_courses"`);
    await queryRunner.query(`DROP TABLE "members"`);
  }
}
