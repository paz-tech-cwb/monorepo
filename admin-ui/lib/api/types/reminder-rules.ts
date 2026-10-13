// admin-ui/lib/api/types/reminder-rules.ts

export type ReminderRuleType =
  | 'form_report'
  | 'event'
  | 'member_journey'
  | 'life_group_attendance'
  | 'life_group_tasks'

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

export interface LifeGroupAttendanceReminderConfig {
  // Hours after the group's meeting start at which the primary push is sent.
  hours_after_meeting_start?: number
  // Legacy copy (primary push while LIFE_GROUP_MEETING_V2 is off).
  title: string
  message: string
  // ---- Fields below only take effect when the backend flag LIFE_GROUP_MEETING_V2 is on.
  // Primary push copy (attendance + report).
  meeting_title?: string
  meeting_message?: string
  // Follow-ups are relative to the meeting datetime (date + start time, church timezone):
  // first one this many hours after the meeting (default 24)...
  followup_first_after_hours?: number
  // ...then every this many hours (default 24).
  followup_interval_hours?: number
  // Cap: last day after the meeting that may get a follow-up (0 = no follow-up).
  followup_max_days?: number
  // Catch-up window after each due time, in hours (2-12, hourly scheduler ticks; default 2; older values < 2 are read as 2).
  followup_window_hours?: number
  /** @deprecated old 09:00 model; never sent any more, dropped on save. */
  followup_hour?: number
  /** @deprecated old model; the backend reads it only as a fallback (days * 24 hours). */
  followup_interval_days?: number
  followup_title?: string
  followup_message?: string
  // Days after the meeting datetime when the sector leader is told (0 = off; default 5).
  escalation_after_days?: number
  // `{group}` and `{date}` (DD/MM) are replaced.
  escalation_title?: string
  escalation_message?: string
  // category is always 'life_group_attendance' — hardcoded in the evaluator
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
  | LifeGroupAttendanceReminderConfig
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
