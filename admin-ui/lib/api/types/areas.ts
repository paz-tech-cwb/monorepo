export interface Area {
  id: number
  name: string
  leader_id: number | null
  leader_name: string | null
  co_leader_id: number | null
  co_leader_name: string | null
  created_at: string
  updated_at: string
}

export interface CreateAreaRequest {
  name: string
  leader_id?: number | null
  co_leader_id?: number | null
}

export type UpdateAreaRequest = Partial<CreateAreaRequest>

export interface AreaHierarchyLifeGroup {
  id: number
  name: string
  sector_id: number
  leader_id: number | null
  leader_name: string | null
  co_leader_id: number | null
  co_leader_name: string | null
}

export interface AreaHierarchySector {
  id: number
  name: string
  area_id: number
  leader_id: number | null
  leader_name: string | null
  co_leader_id: number | null
  co_leader_name: string | null
  life_groups: AreaHierarchyLifeGroup[]
}

export interface AreaHierarchy {
  id: number
  name: string
  leader_id: number | null
  leader_name: string | null
  co_leader_id: number | null
  co_leader_name: string | null
  sectors: AreaHierarchySector[]
}
