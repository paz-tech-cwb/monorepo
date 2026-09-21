export interface Area {
  id: number
  name: string
  leader_id: number | null
  leader_name: string | null
  co_leader_id: number | null
  co_leader_name: string | null
  pastor_id: number | null
  pastor_name: string | null
  co_pastor_id: number | null
  co_pastor_name: string | null
  created_at: string
  updated_at: string
}

export interface CreateAreaRequest {
  name: string
  leader_id?: number | null
  co_leader_id?: number | null
  pastor_id?: number | null
  co_pastor_id?: number | null
}

export type UpdateAreaRequest = Partial<CreateAreaRequest>

export interface AreaHierarchyLifeGroup {
  id: number
  name: string
  sector_id: number | null
  leader_id: number | null
  leader_name: string | null
  co_leader_id: number | null
  co_leader_name: string | null
}

export interface AreaHierarchySector {
  id: number
  name: string
  area_id: number | null
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

export interface OrgChartArea {
  id: number
  name: string
  leader_id: number | null
  leader_name: string | null
  co_leader_id: number | null
  co_leader_name: string | null
  sectors: AreaHierarchySector[]
}

export interface OrgChartRoot {
  id: string
  pastor_id: number
  pastor_name: string | null
  co_pastor_id: number | null
  co_pastor_name: string | null
  areas: OrgChartArea[]
}

export interface OrgChart {
  roots: OrgChartRoot[]
  unassigned_areas: OrgChartArea[]
  unassigned_sectors: AreaHierarchySector[]
  unassigned_life_groups: AreaHierarchyLifeGroup[]
}
