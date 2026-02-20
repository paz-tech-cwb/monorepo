import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHome1757199103445 implements MigrationInterface {
    name = 'CreateHome1757199103445'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "events" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "date" TIMESTAMP NOT NULL, "image_url" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "contributions" ("id" SERIAL NOT NULL, "bank_name" character varying NOT NULL, "branch_number" character varying NOT NULL, "account_number" character varying NOT NULL, "pix_key" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ca2b4f39eb9e32a61278c711f79" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "announcements" ("id" SERIAL NOT NULL, "image_url" character varying NOT NULL, "title" character varying NOT NULL, "subtitle" character varying NOT NULL, "markdown_content" text NOT NULL, "action_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "announcements"`);
        await queryRunner.query(`DROP TABLE "contributions"`);
        await queryRunner.query(`DROP TABLE "events"`);
    }

}
