import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1694000000000 implements MigrationInterface {
  name = 'InitialSchema1694000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // roles
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    // addresses
    await queryRunner.query(`
      CREATE TABLE "addresses" (
        "id" SERIAL NOT NULL,
        "street" character varying(255) NOT NULL,
        "city" character varying(255) NOT NULL,
        "state" character varying(255) NOT NULL,
        "country" character varying(255) NOT NULL,
        "zipCode" character varying(255) NOT NULL,
        CONSTRAINT "PK_addresses" PRIMARY KEY ("id")
      )
    `);

    // users (base columns only — role_slug/status/membership_date added by 1757250000002,
    //        role_id by 1757250000011, sectorId/lifeGroupId by 1757250000018)
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "email" character varying(255),
        "phone_number" character varying(15),
        "birth_date" date,
        "picture" character varying(500),
        "addressId" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_address" FOREIGN KEY ("addressId")
          REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // user_accounts
    await queryRunner.query(`
      CREATE TABLE "user_accounts" (
        "id" SERIAL NOT NULL,
        "refresh_token" character varying NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" integer NOT NULL,
        CONSTRAINT "UQ_user_accounts_refresh_token" UNIQUE ("refresh_token"),
        CONSTRAINT "PK_user_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_accounts_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // announcements
    await queryRunner.query(`
      CREATE TABLE "announcements" (
        "id" SERIAL NOT NULL,
        "image_url" character varying NOT NULL,
        "title" character varying NOT NULL,
        "subtitle" character varying NOT NULL,
        "markdown_content" text NOT NULL,
        "action_url" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_announcements" PRIMARY KEY ("id")
      )
    `);

    // contributions
    await queryRunner.query(`
      CREATE TABLE "contributions" (
        "id" SERIAL NOT NULL,
        "bank_name" character varying NOT NULL,
        "branch_number" character varying NOT NULL,
        "account_number" character varying NOT NULL,
        "pix_key" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contributions" PRIMARY KEY ("id")
      )
    `);

    // events
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "date" TIMESTAMP NOT NULL,
        "image_url" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TABLE "contributions"`);
    await queryRunner.query(`DROP TABLE "announcements"`);
    await queryRunner.query(`DROP TABLE "user_accounts"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "addresses"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
