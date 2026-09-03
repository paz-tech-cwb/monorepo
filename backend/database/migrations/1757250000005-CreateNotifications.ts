import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1757250000005 implements MigrationInterface {
  name = 'CreateNotifications1757250000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" SERIAL NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "channels" jsonb NOT NULL,
        "target_audience" character varying(100) NOT NULL,
        "recipients" integer NOT NULL DEFAULT 0,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
