import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJourneyTrackPromotesToRole1795700000001
  implements MigrationInterface
{
  name = 'AddJourneyTrackPromotesToRole1795700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "journey_tracks" ADD COLUMN "promotes_to_role" character varying(50)
    `);
    await queryRunner.query(`
      UPDATE "journey_tracks" SET "promotes_to_role" = 'discipler' WHERE "key" = 'discipler'
    `);
    await queryRunner.query(`
      UPDATE "journey_tracks" SET "promotes_to_role" = 'life_group_leader' WHERE "key" = 'leader'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "journey_tracks"."promotes_to_role" IS 'roles.slug to promote the member to when every non-informational step completes. NULL = no promotion.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "journey_tracks" DROP COLUMN "promotes_to_role"`,
    );
  }
}
