import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMemberJourneyStages1757250000007
  implements MigrationInterface
{
  name = 'CreateMemberJourneyStages1757250000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "member_journey_stages" (
        "id" SERIAL NOT NULL,
        "member_id" integer NOT NULL,
        "stage_id" integer NOT NULL,
        "stage_key" character varying(50) NOT NULL,
        "completed" boolean NOT NULL DEFAULT false,
        "completed_at" TIMESTAMP,
        "note" character varying(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_member_stage" UNIQUE ("member_id", "stage_id"),
        CONSTRAINT "PK_member_journey_stages" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "member_journey_stages"
        ADD CONSTRAINT "FK_member_journey_member"
          FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_mjs_member_id" ON "member_journey_stages"("member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mjs_completed" ON "member_journey_stages"("completed", "completed_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_mjs_completed"`);
    await queryRunner.query(`DROP INDEX "IDX_mjs_member_id"`);
    await queryRunner.query(`DROP TABLE "member_journey_stages"`);
  }
}
