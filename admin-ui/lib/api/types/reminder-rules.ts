// admin-ui/lib/api/types/reminder-rules.ts

export type ReminderRuleType = 'form_report' | 'event' | 'member_journey' | 'life_group_tasks'

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

export interface LifeGroupTasksReminderConfig {
  // Days before the meeting. The largest value draws the tasks and notifies
  // assignees; smaller values only remind people already assigned.
  days_before_meeting: number[]
  // Church-timezone hour (0-23) at which the reminders are sent.
  hour: number
  // Assignment push. `{task}` is replaced by the task name.
  title: string
  message: string
  // Reminder push for already-assigned members. `{task}` is replaced too.
  reminder_title: string
  reminder_message: string
  // category is always 'life_group_task' — hardcoded in the evaluator
}

export type ReminderConfig =
  | FormReportReminderConfig
  | EventReminderConfig
  | MemberJourneyReminderConfig
  | LifeGroupTasksReminderConfig

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
