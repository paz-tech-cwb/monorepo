import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMembers1757250000001 implements MigrationInterface {
  name = 'CreateMembers1757250000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "members" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(20),
        "address" character varying(500),
        "birth_date" date,
        "life_group" character varying(255),
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "membership_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_members_email" UNIQUE ("email"),
        CONSTRAINT "PK_members" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "members"`);
  }
}
