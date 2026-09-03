import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMemberRegistrations1780900000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "member_registrations" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "member_registrations" DROP COLUMN IF EXISTS "leader_id"`);
    await queryRunner.query(`ALTER TABLE "member_registrations" ADD COLUMN IF NOT EXISTS "discipulador_name" varchar(180)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "member_registrations" ADD COLUMN "email" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "member_registrations" ADD COLUMN "leader_id" int`);
    await queryRunner.query(`ALTER TABLE "member_registrations" DROP COLUMN IF EXISTS "discipulador_name"`);
  }
}
