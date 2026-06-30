import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLifeGroupsLeaderIdColumn1780900000016
  implements MigrationInterface
{
  name = 'RenameLifeGroupsLeaderIdColumn1780900000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename "leaderId" → "leader_id" to match the entity @JoinColumn({ name: 'leader_id' })
    await queryRunner.query(`
      ALTER TABLE "life_groups"
        RENAME COLUMN "leaderId" TO "leader_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "life_groups"
        RENAME COLUMN "leader_id" TO "leaderId"
    `);
  }
}
