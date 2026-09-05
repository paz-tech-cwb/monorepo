export const JOURNEY_STAGES = [
  { id: 1, key: "salvation",                 label: "Culto de Celebração e Novo Nascimento",             description: "Participou do culto de celebração e decidiu pelo novo nascimento", optional: false },
  { id: 2, key: "registration",              label: "Café com Pastor / Tornar-se Membro",                description: "Tornou-se membro via Café com Pastor", optional: false },
  { id: 3, key: "first_courses",             label: "Estação DNA",                                       description: "Completou a Estação DNA", optional: false },
  { id: 4, key: "serving_ministry",          label: "Servir em um Ministério",                           description: "Serve em um ministério", optional: false },
  { id: 5, key: "life_group",                label: "Life Group",                                        description: "É membro de Life Group", optional: false },
  { id: 6, key: "new_creature_course",       label: "Curso Nova Criatura",                               description: "Completou o curso Nova Criatura", optional: false },
  { id: 7, key: "initial_discipleship_book", label: "Livro de Discipulado do Acompanhamento Inicial",    description: "Completou o livro de discipulado do acompanhamento inicial", optional: false },
  { id: 8, key: "water_baptism",             label: "Batismo nas Águas",                                 description: "Foi batizado nas águas", optional: false },
  { id: 9, key: "discipler_track",           label: "Trilho do Discipulador",                            description: "Completou o trilho do discipulador", optional: false },
  { id: 10, key: "life_group_leader_track",  label: "Trilho do Líder de Life Group",                     description: "Completou o trilho do líder de Life Group", optional: true },
] as const

export type JourneyStageKey = typeof JOURNEY_STAGES[number]["key"]
export type JourneyStageId  = typeof JOURNEY_STAGES[number]["id"]

export interface JourneyStage {
  stage_id: JourneyStageId
  stage_key: JourneyStageKey
  stage_label?: string
  optional: boolean
  completed: boolean
  completed_at?: string
  note?: string
}

export interface JourneyProgress {
  completion_percentage: number
  completed_required_steps: number
  total_required_steps: number
  completed_optional_steps: number
  total_optional_steps: number
  is_complete: boolean
}

export interface MemberJourney {
  member_id: number
  member_name: string
  member_email: string
  life_group?: string
  current_stage_id: JourneyStageId
  progress: JourneyProgress
  stages: JourneyStage[]
  last_updated_at: string
}

export interface JourneyActivity {
  id: number
  member_id: number
  member_name: string
  life_group?: string
  stage_id: JourneyStageId
  stage_key: JourneyStageKey
  stage_label: string
  optional: boolean
  completed_at: string
  note?: string
}

export interface JourneyFeed {
  activities: JourneyActivity[]
  total: number
  page: number
  per_page: number
}

export interface JourneyStats {
  stage_id: JourneyStageId
  stage_key: JourneyStageKey
  stage_label: string
  optional: boolean
  count: number
}

export interface UpdateMemberStageRequest {
  stage_id: JourneyStageId
  completed: boolean
  completed_at?: string
  note?: string
}

export interface JourneyFilterOption {
  id?: number
  value: string
  label: string
  count: number
}

export interface JourneyFilterOptions {
  stages: JourneyFilterOption[]
  life_groups: JourneyFilterOption[]
  ministries: JourneyFilterOption[]
  sectors: JourneyFilterOption[]
  areas: JourneyFilterOption[]
  roles: JourneyFilterOption[]
}

export interface JourneyFeedParams {
  stage_id?: JourneyStageId
  life_group_id?: number
  ministry_id?: number
  sector_id?: number
  area_id?: number
  role?: string
  from?: string
  to?: string
  page?: number
  per_page?: number
}
