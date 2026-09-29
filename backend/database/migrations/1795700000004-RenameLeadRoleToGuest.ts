import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLeadRoleToGuest1795700000004 implements MigrationInterface {
  name = 'RenameLeadRoleToGuest1795700000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "roles" SET "slug" = 'guest', "name" = 'Convidado' WHERE "slug" = 'lead'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "roles" SET "slug" = 'lead', "name" = 'Lead' WHERE "slug" = 'guest'
    `);
  }
}
