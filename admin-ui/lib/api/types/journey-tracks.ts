export type JourneyTrackStepType = "course_completion" | "manual_approval" | "informational"

export type MemberJourneyStepProgressSource = "course_completion" | "manual_approval" | "legacy_import"

export interface JourneyTrackStep {
  id: number
  track_id: number
  key: string | null
  sort_order: number
  type: JourneyTrackStepType
  title: string
  description: string | null
  course_id: string | null
  external_url: string | null
}

export interface JourneyTrack {
  id: number
  key: string
  title: string
  description: string | null
  eligibility_text: string | null
  sort_order: number
  is_active: boolean
  steps: JourneyTrackStep[]
}

export interface CreateJourneyTrackRequest {
  key: string
  title: string
  description?: string | null
  eligibility_text?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface UpdateJourneyTrackRequest {
  title?: string
  description?: string | null
  eligibility_text?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface CreateJourneyTrackStepRequest {
  key?: string | null
  sort_order?: number
  type: JourneyTrackStepType
  title: string
  description?: string | null
  course_id?: string | null
  external_url?: string | null
}

export type UpdateJourneyTrackStepRequest = Partial<CreateJourneyTrackStepRequest>

export interface ReorderJourneyTrackStepsRequest {
  step_ids: number[]
}

export interface ApproveJourneyStepRequest {
  note?: string | null
}

// Member-facing / leader view (progress-annotated) shapes — GET /journey-tracks/me
// and GET /journey-tracks/member/:memberId.

export interface JourneyTrackStepWithProgress {
  id: number
  key: string | null
  sort_order: number
  type: JourneyTrackStepType
  title: string
  description: string | null
  course_id: string | null
  external_url: string | null
  completed: boolean
  completed_at: string | null
  source: MemberJourneyStepProgressSource | null
  completed_by_name: string | null
}

export interface JourneyTrackSummary {
  id: number
  key: string
  title: string
  description: string | null
  eligibility_text: string | null
  sort_order: number
}

export interface MemberJourneyTrackProgress {
  track: JourneyTrackSummary
  steps: JourneyTrackStepWithProgress[]
  progress_percentage: number
}
