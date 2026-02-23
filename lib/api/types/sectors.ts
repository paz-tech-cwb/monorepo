export interface Sector {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface CreateSectorRequest {
  name: string
}

export interface UpdateSectorRequest {
  name: string
}
