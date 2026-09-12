export interface Sector {
  id: number
  name: string
  area_id: number | null
  area_name: string | null
  leader_id: number | null
  leader_name: string | null
  co_leader_id: number | null
  co_leader_name: string | null
  created_at: string
  updated_at: string
}

export interface CreateSectorRequest {
  name: string
  area_id?: number | null
  leader_id?: number | null
  co_leader_id?: number | null
}

export type UpdateSectorRequest = Partial<CreateSectorRequest>
