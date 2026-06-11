export type ReminderRuleType = 'form_report' | 'event' | 'member_journey';

export interface FormReportReminderConfig {
  weekday: number; // 0 = Sunday … 6 = Saturday
  hour: number; // 0–23
  minute: number; // 0–59
  roles: string[]; // role slugs
}

export interface EventReminderConfig {
  lead_times_hours: number[]; // e.g. [24, 1]
}

export interface MemberJourneyReminderConfig {
  threshold_days: number;
  steps: string[]; // stage_key values
}

export type ReminderConfig =
  | FormReportReminderConfig
  | EventReminderConfig
  | MemberJourneyReminderConfig;

export const DEFAULT_CONFIGS: Record<ReminderRuleType, ReminderConfig> = {
  form_report: {
    weekday: 0,
    hour: 20,
    minute: 0,
    roles: ['life_group_leader', 'sector_leader', 'area_leader'],
  },
  event: { lead_times_hours: [24, 1] },
  member_journey: { threshold_days: 7, steps: [] },
};
