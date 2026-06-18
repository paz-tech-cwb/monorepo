import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1750200000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1750200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "audit_logs_action_enum" AS ENUM (
        'LOGIN_SUCCESS',
        'LOGIN_FAILED_ROLE',
        'LOGIN_FAILED_AUTH'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL NOT NULL,
        "user_id" integer,
        "email" character varying(255) NOT NULL,
        "provider" character varying(50) NOT NULL,
        "action" "audit_logs_action_enum" NOT NULL,
        "reason" text,
        "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ip_address" character varying(45),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_email" ON "audit_logs" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_email_timestamp" ON "audit_logs" ("email", "timestamp")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_email_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_email"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "audit_logs_action_enum"`);
  }
}
