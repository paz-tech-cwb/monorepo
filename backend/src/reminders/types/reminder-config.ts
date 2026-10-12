export type ReminderRuleType =
  | 'form_report'
  | 'event'
  | 'member_journey'
  | 'life_group_attendance'
  | 'life_group_tasks';

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

export interface LifeGroupAttendanceReminderConfig {
  hours_after_meeting_start: number; // e.g. 2 — reminder fires this many hours after the group's scheduled meeting start
  title: string;
  message: string;
  // category is always 'life_group_attendance' — hardcoded at dispatch time
}

export interface LifeGroupTasksReminderConfig {
  // Days before the group's meeting at which the rule fires, e.g. [3, 1].
  // The LARGEST offset generates (idempotently) and notifies the assignees;
  // smaller offsets only remind members already assigned (and not declined),
  // they never generate or re-roll.
  days_before_meeting: number[];
  hour: number; // 0-23, church timezone
  title: string; // first notification (assignment)
  message: string; // "{task}" is replaced by the task name when present
  reminder_title: string; // follow-up reminder at the smaller offsets
  reminder_message: string; // "{task}" is replaced by the task name
  // category is always 'life_group_task' and the deep link is
  // paz://tarefa/{assignmentId} — hardcoded at dispatch time
}

export type ReminderConfig =
  | FormReportReminderConfig
  | EventReminderConfig
  | MemberJourneyReminderConfig
  | LifeGroupAttendanceReminderConfig
  | LifeGroupTasksReminderConfig;

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
  life_group_attendance: {
    hours_after_meeting_start: 2,
    title: 'Lançar presença do Life Group',
    message:
      'A reunião do seu Life Group já começou. Não se esqueça de lançar a presença dos membros.',
  },
  life_group_tasks: {
    days_before_meeting: [3, 1],
    hour: 9,
    title: 'Sua tarefa no Life Group',
    message:
      'Você foi sorteado(a) para "{task}" no próximo Life Group. Toque para ver o guia.',
    reminder_title: 'Lembrete: sua tarefa no Life Group',
    reminder_message:
      'Não esqueça: você ficou com "{task}" no Life Group. Toque para rever o guia.',
  },
};

/**
 * Returns an error message when `config` is not valid for `type`, else null.
 * Only `life_group_tasks` has structural constraints worth enforcing here
 * (the evaluator also sanitizes defensively); other types keep accepting any
 * object, as before.
 */
export function validateReminderConfig(
  type: ReminderRuleType,
  config: unknown,
): string | null {
  if (type !== 'life_group_tasks') return null;
  const cfg = config as Partial<LifeGroupTasksReminderConfig> | null;
  if (!cfg || typeof cfg !== 'object') return 'config must be an object';
  const offsets = cfg.days_before_meeting;
  if (
    !Array.isArray(offsets) ||
    offsets.length === 0 ||
    !offsets.every((n) => Number.isInteger(n) && n >= 0 && n <= 30)
  ) {
    return 'days_before_meeting must be a non-empty array of integers 0-30';
  }
  const hour = cfg.hour;
  if (
    typeof hour !== 'number' ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    return 'hour must be an integer 0-23';
  }
  return null;
}
