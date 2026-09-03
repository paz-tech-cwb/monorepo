import { MigrationInterface, QueryRunner } from 'typeorm';

const NEW_CONFIG = JSON.stringify({
  forms: [
    {
      form_slug: 'life-group-reports',
      title: 'Relatório de Life Group pendente',
      message:
        'Você ainda não enviou o relatório do seu Life Group desta semana. Acesse o app para enviar.',
      weekday: 0,
      hour: 20,
      roles: ['life_group_leader'],
    },
    {
      form_slug: 'sector-supervisor-reports',
      title: 'Relatório de Setor pendente',
      message:
        'O relatório semanal das atividades do seu setor ainda não foi enviado. Acesse o app para enviar.',
      weekday: 0,
      hour: 21,
      roles: ['sector_leader'],
    },
    {
      form_slug: 'area-supervisor-reports',
      title: 'Relatório de Área pendente',
      message:
        'O relatório semanal das atividades da sua área ainda não foi enviado. Acesse o app para enviar.',
      weekday: 1,
      hour: 8,
      roles: ['area_leader'],
    },
    {
      form_slug: 'service-reports',
      title: 'Relatório do Culto pendente',
      message:
        'O relatório do culto desta semana ainda não foi enviado. Acesse o app para enviar.',
      weekday: 1,
      hour: 9,
      roles: ['pastor', 'admin'],
    },
  ],
});

export class UpdateFormReportReminderConfig1780900000004
  implements MigrationInterface
{
  name = 'UpdateFormReportReminderConfig1780900000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "reminder_rules" SET "config" = $1 WHERE "type" = 'form_report'`,
      [NEW_CONFIG],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const oldConfig = JSON.stringify({
      weekday: 0,
      hour: 20,
      minute: 0,
      roles: ['life_group_leader', 'sector_leader', 'area_leader'],
      title: 'Lembrete: relatório de reunião pendente',
      message:
        'Você ainda não enviou o relatório da reunião desta semana. Toque para enviar.',
      category: 'meeting_reports',
    });
    await queryRunner.query(
      `UPDATE "reminder_rules" SET "config" = $1 WHERE "type" = 'form_report'`,
      [oldConfig],
    );
  }
}
