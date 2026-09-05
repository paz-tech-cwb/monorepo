import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeetingReports1757250000015 implements MigrationInterface {
  name = 'CreateMeetingReports1757250000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meeting_reports" (
        "id" SERIAL NOT NULL,
        "meeting_date" date NOT NULL,
        "total_members" integer NOT NULL,
        "members_present" integer NOT NULL,
        "children_0_11" integer NOT NULL DEFAULT 0,
        "invited_persons" integer NOT NULL DEFAULT 0,
        "mdas" text,
        "offering_amount" decimal(10,2) NOT NULL DEFAULT 0,
        "tadel_attendees" integer NOT NULL DEFAULT 0,
        "culto_attendees" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "leaderId" integer NOT NULL,
        "lifeGroupId" integer NOT NULL,
        "areaId" integer NOT NULL,
        "sectorId" integer NOT NULL,
        CONSTRAINT "PK_meeting_reports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meeting_reports_leader" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_meeting_reports_life_group" FOREIGN KEY ("lifeGroupId") REFERENCES "life_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_meeting_reports_area" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_meeting_reports_sector" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "meeting_reports"`);
  }
}
