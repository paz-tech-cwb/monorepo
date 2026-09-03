export interface Area {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface CreateAreaRequest {
  name: string
}

export interface UpdateAreaRequest {
  name: string
}
