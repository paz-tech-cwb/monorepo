export type FormSlug =
  | 'member-registrations'
  | 'form-conversions'
  | 'life-group-reports'
  | 'sector-supervisor-reports'
  | 'area-supervisor-reports'
  | 'multiplications'
  | 'service-reports'
  | 'form-guests'

export interface FormCatalogEntry {
  slug: FormSlug
  name: string
  description: string
  can_write: boolean
  can_read: boolean
}

export interface FormSubmissionMeta {
  id: string
  submitted_by: { id: number; name: string }
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AuditLogEntry {
  id: string
  form_slug: FormSlug
  submission_id: string
  actor: { id: number; name: string }
  action: 'create' | 'update' | 'delete'
  diff: Record<string, unknown> | null
  created_at: string
}

export interface FormCourse {
  id: string
  name: string
  description: string | null
  is_active: boolean
  display_order?: number
  created_at: string
  updated_at: string
}
export interface CreateCourseRequest { name: string; description?: string }
export interface UpdateCourseRequest { name?: string; description?: string; is_active?: boolean }

export interface MemberRegistration extends FormSubmissionMeta {
  email: string; full_name: string; birth_date: string; phone: string
  gender: 'm' | 'f'; civil_state: string
  cep: string | null; street: string | null; address_number: string | null
  complement: string | null; neighborhood: string | null; city: string | null
  state: string | null; address: string | null
  sector_id: number; life_group_id: number | null; leader_id: number | null
  completed_courses: string[]
}

export interface FormConversion extends FormSubmissionMeta {
  full_name: string; email: string; phone: string
  decision_type: 'first_time' | 'reconciliation'
  how_met_church: string; how_met_church_other: string | null
  gender: 'm' | 'f'; birth_date: string; civil_state: string
  address: string; attendance_count: string; life_group_status: string
  life_group_leader_or_name: string | null; invited_by: string | null; notes: string | null
}

export interface LifeGroupReport extends FormSubmissionMeta {
  date: string; area_id: number; sector_id: number; life_group_id: number
  committed_members: number; committed_members_present: number
  kids_0_to_11: number; guests: number; mdas: number; offering: string
  committed_at_tadel: number; committed_at_culto: number
  leader_attended: string[]; disciples_count: number
  disciples_discipled_this_week: number
  pastoring_activity_type: string; training_activity_type: string
}

export interface SectorSupervisorReport extends FormSubmissionMeta {
  date: string; sector_id: number; area_id: number | null
  meetings_held: number; trainings_conducted: number; notes: string | null
}

export interface AreaSupervisorReport extends FormSubmissionMeta {
  date: string; area_id: number; meetings_held: number; notes: string | null
}

export interface Multiplication extends FormSubmissionMeta {
  date: string; new_life_group_name: string; area_id: number; sector_id: number
}

export interface ServiceReport extends FormSubmissionMeta {
  date: string; service_type: string; total_attendance: number; offering: string
}

export interface FormGuest extends FormSubmissionMeta {
  full_name: string; phone: string; invited_by: string; created_at: string
}

export interface FormUserLookupResult {
  id: number; full_name: string; email: string | null; phone: string | null
  birth_date: string | null; sector_id: number | null
  life_group_id: number | null; leader_id: number | null
}

export interface FormSubmissionFilters {
  start_date?: string; end_date?: string
  area_id?: number; sector_id?: number; life_group_id?: number
}
