import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConversions1757250000017 implements MigrationInterface {
  name = 'CreateConversions1757250000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "conversions_type_enum" AS ENUM('primeira_vez', 'reconciliacao')
    `);

    await queryRunner.query(`
      CREATE TYPE "conversions_sex_enum" AS ENUM('feminino', 'masculino')
    `);

    await queryRunner.query(`
      CREATE TYPE "conversions_civil_status_enum" AS ENUM('solteiro', 'casado', 'divorciado', 'viuvo')
    `);

    await queryRunner.query(`
      CREATE TYPE "conversions_life_group_experience_enum" AS ENUM('sim', 'nao', 'ja_foi_convidado')
    `);

    await queryRunner.query(`
      CREATE TABLE "conversions" (
        "id" SERIAL NOT NULL,
        "full_name" character varying(255) NOT NULL,
        "cellphone" character varying(20),
        "type" "conversions_type_enum" NOT NULL,
        "how_met_church" text,
        "sex" "conversions_sex_enum",
        "age" integer,
        "civil_status" "conversions_civil_status_enum",
        "address" character varying(500),
        "church_attendance_history" character varying(255),
        "life_group_experience" "conversions_life_group_experience_enum",
        "life_group_leader_name" character varying(255),
        "who_invited" character varying(255),
        "observations" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversions" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "conversions"`);
    await queryRunner.query(`DROP TYPE "conversions_life_group_experience_enum"`);
    await queryRunner.query(`DROP TYPE "conversions_civil_status_enum"`);
    await queryRunner.query(`DROP TYPE "conversions_sex_enum"`);
    await queryRunner.query(`DROP TYPE "conversions_type_enum"`);
  }
}
