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

  // ---- V2 (behind the server flag LIFE_GROUP_MEETING_V2, default off) ----
  // All optional: rows saved before V2 lack them and get DEFAULT_CONFIGS
  // values via resolveLifeGroupAttendanceConfig(). The legacy `title` and
  // `message` above keep driving the primary push while the flag is off.
  meeting_title?: string; // primary push copy for the combined attendance + report flow
  meeting_message?: string;
  // Follow-ups are relative to the meeting datetime (meeting date + meeting_time,
  // church timezone): first at +followup_first_after_hours, then every
  // followup_interval_hours, never later than followup_max_days days after the
  // meeting and never at/after the escalation instant.
  followup_first_after_hours?: number; // 1-168; default 24
  followup_interval_hours?: number; // 1-168; default 24
  followup_max_days?: number; // cap: last day after the meeting that may get a follow-up (0 = follow-ups off)
  followup_window_hours?: number; // 0-12; catch-up window after each due time (hourly ticks); default 2
  /** @deprecated pre-2026-10-13 saved configs: 09:00-next-morning model. Ignored. */
  followup_hour?: number;
  /** @deprecated read only as a fallback: followup_interval_hours = days * 24. */
  followup_interval_days?: number;
  followup_title?: string;
  followup_message?: string;
  escalation_after_days?: number; // days after the meeting datetime the sector leader is told (0 = off); default 5
  // "{group}" and "{date}" (DD/MM) are replaced
  escalation_title?: string;
  escalation_message?: string;
  // escalation deep link is paz://lifegroup/{id}, category life_group_attendance
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
    meeting_title: 'Registre a reunião do Life Group',
    meeting_message:
      'Registre a presença e o relatório do seu Life Group. Toque para abrir.',
    followup_first_after_hours: 24,
    followup_interval_hours: 24,
    followup_max_days: 5,
    followup_window_hours: 2,
    followup_title: 'Relatório do Life Group pendente',
    followup_message:
      'A presença foi lançada, mas o relatório da reunião ainda não foi enviado. Toque para concluir.',
    escalation_after_days: 5,
    escalation_title: 'Relatório de Life Group pendente',
    escalation_message:
      'O Life Group {group} ainda não enviou o relatório da reunião de {date}.',
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

function isIntInRange(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

const ATTENDANCE_INT_FIELDS: Array<[string, number, number]> = [
  ['hours_after_meeting_start', 0, 23],
  ['followup_first_after_hours', 1, 168],
  ['followup_interval_hours', 1, 168],
  ['followup_max_days', 0, 14],
  ['followup_window_hours', 0, 12],
  // deprecated keys: still accepted so configs saved before the
  // meeting-relative timing keep saving
  ['followup_hour', 0, 23],
  ['followup_interval_days', 1, 7],
  ['escalation_after_days', 0, 14],
];

const ATTENDANCE_TEXT_FIELDS = [
  'title',
  'message',
  'meeting_title',
  'meeting_message',
  'followup_title',
  'followup_message',
  'escalation_title',
  'escalation_message',
];

function validateAttendanceConfig(config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return 'config must be an object';
  }
  const cfg = config as Record<string, unknown>;
  for (const [key, min, max] of ATTENDANCE_INT_FIELDS) {
    if (cfg[key] !== undefined && !isIntInRange(cfg[key], min, max)) {
      return `${key} must be an integer ${min}-${max}`;
    }
  }
  for (const key of ATTENDANCE_TEXT_FIELDS) {
    const value = cfg[key];
    if (value === undefined) continue;
    // Legacy copy (`title`/`message`) was never validated before V2, so a
    // blank one keeps saving (flag-off behavior unchanged); the V2 copy keys
    // reject blank (the admin UI omits them so the defaults apply).
    const legacy = key === 'title' || key === 'message';
    if (typeof value === 'string' && value.trim().length === 0 && legacy) {
      continue;
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      return `${key} must be a non-empty string`;
    }
    if (value.length > 500) return `${key} must be at most 500 characters`;
  }
  return null;
}

/**
 * Returns an error message when `config` is not valid for `type`, else null.
 * `life_group_tasks` is strict; `life_group_attendance` validates only the
 * fields that are present (legacy rows lack the V2 ones); other types keep
 * accepting any object, as before.
 */
export function validateReminderConfig(
  type: ReminderRuleType,
  config: unknown,
): string | null {
  if (type === 'life_group_attendance') return validateAttendanceConfig(config);
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

/** `life_group_attendance` config with every V2 field resolved (stored value, else default). */
export type ResolvedLifeGroupAttendanceConfig = Required<
  Omit<
    LifeGroupAttendanceReminderConfig,
    'followup_hour' | 'followup_interval_days'
  >
>;

export function resolveLifeGroupAttendanceConfig(
  config: unknown,
): ResolvedLifeGroupAttendanceConfig {
  const defaults =
    DEFAULT_CONFIGS.life_group_attendance as ResolvedLifeGroupAttendanceConfig;
  const cfg = (config ?? {}) as Partial<LifeGroupAttendanceReminderConfig>;
  const int = (value: unknown, fallback: number, min: number, max: number) =>
    isIntInRange(value, min, max) ? (value as number) : fallback;
  const text = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  return {
    hours_after_meeting_start: int(
      cfg.hours_after_meeting_start,
      defaults.hours_after_meeting_start,
      0,
      23,
    ),
    title: text(cfg.title, defaults.title),
    message: text(cfg.message, defaults.message),
    meeting_title: text(cfg.meeting_title, defaults.meeting_title),
    meeting_message: text(cfg.meeting_message, defaults.meeting_message),
    followup_first_after_hours: int(
      cfg.followup_first_after_hours,
      defaults.followup_first_after_hours,
      1,
      168,
    ),
    // Old rows saved followup_interval_days (daily/every N days): honor it as
    // N * 24 hours when the new key is absent. `followup_hour` is ignored.
    followup_interval_hours: int(
      cfg.followup_interval_hours,
      isIntInRange(cfg.followup_interval_days, 1, 7)
        ? (cfg.followup_interval_days as number) * 24
        : defaults.followup_interval_hours,
      1,
      168,
    ),
    followup_window_hours: int(
      cfg.followup_window_hours,
      defaults.followup_window_hours,
      0,
      12,
    ),
    followup_max_days: int(
      cfg.followup_max_days,
      defaults.followup_max_days,
      0,
      14,
    ),
    followup_title: text(cfg.followup_title, defaults.followup_title),
    followup_message: text(cfg.followup_message, defaults.followup_message),
    escalation_after_days: int(
      cfg.escalation_after_days,
      defaults.escalation_after_days,
      0,
      14,
    ),
    escalation_title: text(cfg.escalation_title, defaults.escalation_title),
    escalation_message: text(
      cfg.escalation_message,
      defaults.escalation_message,
    ),
  };
}

/**
 * Stored `life_group_tasks` config merged with the defaults (legacy rows may
 * lack some keys). Shared by the evaluator and by the manual-generate push.
 */
export function resolveLifeGroupTasksConfig(
  config: unknown,
): LifeGroupTasksReminderConfig {
  const defaults =
    DEFAULT_CONFIGS.life_group_tasks as LifeGroupTasksReminderConfig;
  const cfg = (config ?? {}) as Partial<LifeGroupTasksReminderConfig>;
  return {
    days_before_meeting: Array.isArray(cfg.days_before_meeting)
      ? cfg.days_before_meeting
      : defaults.days_before_meeting,
    hour: typeof cfg.hour === 'number' ? cfg.hour : defaults.hour,
    title: cfg.title || defaults.title,
    message: cfg.message || defaults.message,
    reminder_title: cfg.reminder_title || defaults.reminder_title,
    reminder_message: cfg.reminder_message || defaults.reminder_message,
  };
}
