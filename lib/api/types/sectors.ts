export interface Sector {
  id: number
  name: string
  area_id: number | null
  created_at: string
  updated_at: string
}

export interface CreateSectorRequest {
  name: string
}

export interface UpdateSectorRequest {
  name: string
}
