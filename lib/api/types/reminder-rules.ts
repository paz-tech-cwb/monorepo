// admin-ui/lib/api/types/reminder-rules.ts

export type ReminderRuleType = 'form_report' | 'event' | 'member_journey'

export interface FormReportReminderConfig {
  weekday: number
  hour: number
  minute: number
  roles: string[]
}

export interface EventReminderConfig {
  lead_times_hours: number[]
}

export interface MemberJourneyReminderConfig {
  threshold_days: number
  steps: string[]
}

export type ReminderConfig =
  | FormReportReminderConfig
  | EventReminderConfig
  | MemberJourneyReminderConfig

export interface ReminderRule {
  id: number
  type: ReminderRuleType
  enabled: boolean
  config: ReminderConfig
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface UpdateReminderRuleRequest {
  enabled?: boolean
  config?: ReminderConfig
}
