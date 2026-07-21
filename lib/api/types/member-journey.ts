export const JOURNEY_STAGES = [
  { id: 1, key: "salvation",      label: "Salvação",              description: "Conheceu a igreja e aceitou Jesus" },
  { id: 2, key: "registration",   label: "Cadastro",              description: "Cadastrado no sistema" },
  { id: 3, key: "first_courses",  label: "Primeiros Cursos",      description: "Curso de membros concluído" },
  { id: 4, key: "discovery",      label: "Evento de Descoberta",  description: "Participou do evento da igreja" },
  { id: 5, key: "life_group",     label: "Life Group",            description: "Ingressou em um life group" },
  { id: 6, key: "discipleship",   label: "Discipulado",           description: "Em discipulado com líder" },
  { id: 7, key: "water_baptism",  label: "Batismo nas Águas",     description: "Batizado nas águas" },
  { id: 8, key: "disciple_maker", label: "Fazedor de Discípulos", description: "Tornou-se líder de life group" },
] as const

export type JourneyStageKey = typeof JOURNEY_STAGES[number]["key"]
export type JourneyStageId  = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface JourneyStage {
  stage_id: JourneyStageId
  stage_key: JourneyStageKey
  completed: boolean
  completed_at?: string
  note?: string
}

export interface MemberJourney {
  member_id: number
  member_name: string
  member_email: string
  life_group?: string
  current_stage_id: JourneyStageId
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
