// admin-ui/lib/api/types/reminder-rules.ts

export type ReminderRuleType = 'form_report' | 'event' | 'member_journey'

export interface FormReminderEntry {
  form_slug: string
  title: string
  message: string
  weekday: number
  hour: number
  roles: string[]
}

export interface FormReportReminderConfig {
  forms: FormReminderEntry[]
}

export interface EventReminderConfig {
  lead_times_hours: number[]
  title: string
  // message is always the event's own title — set dynamically at dispatch time
  // category is always 'events' — hardcoded in the evaluator
}

export interface MemberJourneyStep {
  key: string
  days: number
}

export interface MemberJourneyReminderConfig {
  steps: MemberJourneyStep[]
  title: string
  message: string
  // category is always 'member_journey' — hardcoded in the evaluator
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
