// Life group rotating tasks. Mirrors the backend JSON (snake_case) shape.

export interface LifeGroupTaskTemplate {
  id: number
  name: string
  description: string
  // Markdown
  guidance: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateLifeGroupTaskTemplateRequest {
  name: string
  description?: string
  guidance?: string
  is_active?: boolean
}

export interface UpdateLifeGroupTaskTemplateRequest {
  name?: string
  description?: string
  guidance?: string
  is_active?: boolean
}

export interface ReorderLifeGroupTaskTemplatesRequest {
  template_ids: number[]
}

export type LifeGroupTaskStatus = "assigned" | "declined" | "completed"
export type LifeGroupTaskSource = "auto" | "manual" | "reroll"

export interface LifeGroupTaskAssignment {
  id: string
  template_id: number
  meeting_date: string
  user_id: number
  user_name: string
  task_name: string
  task_description: string
  task_guidance: string
  status: LifeGroupTaskStatus
  source: LifeGroupTaskSource
  notified_at: string | null
  reminded_at: string | null
  // False when the assignee became ineligible after being assigned.
  assignee_eligible: boolean
}

export interface LifeGroupTaskUnassignedTemplate {
  template_id: number
  name: string
}

export interface LifeGroupTaskMeeting {
  meeting_date: string
  skipped: boolean
  assignments: LifeGroupTaskAssignment[]
  unassigned_templates: LifeGroupTaskUnassignedTemplate[]
}

export interface GenerateLifeGroupTasksResponse extends LifeGroupTaskMeeting {
  unassignable_template_ids: number[]
}

export interface GenerateLifeGroupTasksRequest {
  // Omitted = the group's next meeting date.
  meeting_date?: string
}

export interface RerollLifeGroupTaskRequest {
  assignment_id: string
}

export interface ReassignLifeGroupTaskRequest {
  user_id: number
}

export interface LifeGroupTaskOverride {
  template_id: number
  name: string
  description: string
  template_guidance: string
  is_enabled: boolean
  guidance_override: string | null
}

export interface LifeGroupTaskOverrideEntry {
  template_id: number
  is_enabled: boolean
  // null/empty clears the override.
  guidance_override?: string | null
}

export interface UpsertLifeGroupTaskOverridesRequest {
  overrides: LifeGroupTaskOverrideEntry[]
}

// manual = explicit leader decision; leader = leader/co-leader default;
// auto = reached the attendance threshold; pending = still below it.
export type LifeGroupTaskEligibilitySource = "manual" | "leader" | "auto" | "pending"

export interface LifeGroupTaskMember {
  user_id: number
  name: string
  is_leader: boolean
  is_co_leader: boolean
  eligible: boolean
  eligibility_source: LifeGroupTaskEligibilitySource
  present_count: number
  min_present_meetings: number
  // True when the member was grandfathered by the migration (a dedicated
  // backend flag, not derived from the note): do not offer "back to automatic"
  // (it would drop an established member). Sole source for the "Membro antigo"
  // badge and for hiding that button.
  grandfathered: boolean
  // Leader-only note: the leader's own text only, never system marker text.
  reason: string | null
  excluded_template_ids: number[]
}

export interface LifeGroupTaskMemberEntry {
  user_id: number
  // Required unless reset_to_automatic is true.
  eligible?: boolean
  // Omitted = unchanged; null/empty = cleared.
  reason?: string | null
  // Omitted = unchanged; [] = cleared.
  excluded_template_ids?: number[]
  reset_to_automatic?: boolean
}

export interface UpsertLifeGroupTaskMembersRequest {
  members: LifeGroupTaskMemberEntry[]
}

export interface LifeGroupTaskSettings {
  min_present_meetings: number
}

export interface LifeGroupTaskSkip {
  meeting_date: string
}
