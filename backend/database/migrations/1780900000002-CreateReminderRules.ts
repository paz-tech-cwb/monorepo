import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReminderRules1780900000002 implements MigrationInterface {
  name = 'CreateReminderRules1780900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "reminder_rule_type_enum" AS ENUM ('form_report', 'event', 'member_journey')`,
    );
    await queryRunner.query(`
      CREATE TABLE "reminder_rules" (
        "id" SERIAL PRIMARY KEY,
        "type" "reminder_rule_type_enum" NOT NULL UNIQUE,
        "enabled" boolean NOT NULL DEFAULT false,
        "config" jsonb NOT NULL DEFAULT '{}',
        "last_run_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "reminder_rules" ("type", "enabled", "config") VALUES
        ('form_report', false, '{"forms":[{"form_slug":"life-group-reports","title":"Relatório de Life Group pendente","message":"Você ainda não enviou o relatório do seu Life Group desta semana. Acesse o app para enviar.","weekday":0,"hour":20,"roles":["life_group_leader"]},{"form_slug":"sector-supervisor-reports","title":"Relatório de Setor pendente","message":"O relatório semanal das atividades do seu setor ainda não foi enviado. Acesse o app para enviar.","weekday":0,"hour":21,"roles":["sector_leader"]},{"form_slug":"area-supervisor-reports","title":"Relatório de Área pendente","message":"O relatório semanal das atividades da sua área ainda não foi enviado. Acesse o app para enviar.","weekday":1,"hour":8,"roles":["area_leader"]},{"form_slug":"service-reports","title":"Relatório do Culto pendente","message":"O relatório do culto desta semana ainda não foi enviado. Acesse o app para enviar.","weekday":1,"hour":9,"roles":["pastor","admin"]}]}'),
        ('event', false, '{"lead_times_hours":[24,1],"title":"Não perca este evento!"}'),
        ('member_journey', false, '{"steps":[],"title":"Continue sua jornada","message":"Há um próximo passo esperando por você na sua jornada."}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reminder_rules"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reminder_rule_type_enum"`);
  }
}
