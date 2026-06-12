export type ReminderRuleType = 'form_report' | 'event' | 'member_journey';

export interface FormReminderEntry {
  form_slug: string; // e.g. 'life-group-reports'
  title: string;
  message: string;
  weekday: number; // 0 = Sunday … 6 = Saturday
  hour: number; // 0–23
  roles: string[]; // role slugs that receive this reminder
}

export interface FormReportReminderConfig {
  forms: FormReminderEntry[];
}

export interface EventReminderConfig {
  lead_times_hours: number[]; // e.g. [24, 1]
  title: string; // notification title shown on the lock screen
  // message is always the event's own title — set dynamically at dispatch time
}

export interface MemberJourneyStep {
  key: string;
  days: number;
}

export interface MemberJourneyReminderConfig {
  steps: MemberJourneyStep[];
  title: string;
  message: string;
  // category is always 'member_journey' — hardcoded at dispatch time
}

export type ReminderConfig =
  | FormReportReminderConfig
  | EventReminderConfig
  | MemberJourneyReminderConfig;

export const DEFAULT_CONFIGS: Record<ReminderRuleType, ReminderConfig> = {
  form_report: {
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
  },
  event: {
    lead_times_hours: [24, 1],
    title: 'Não perca este evento!',
  },
  member_journey: {
    steps: [],
    title: 'Continue sua jornada',
    message: 'Há um próximo passo esperando por você na sua jornada.',
  },
};
