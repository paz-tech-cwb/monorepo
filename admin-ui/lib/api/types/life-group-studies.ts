export interface LifeGroupStudy {
  id: string
  image_url?: string | null
  title: string
  author: string
  body_markdown: string
  published_by_id: number
  created_at: string
  updated_at: string
}

export interface LifeGroupStudiesApiResponse {
  data: LifeGroupStudy[]
  meta: {
    total: number
    page: number
    limit: number
  }
}

export interface CreateLifeGroupStudyRequest {
  image_url?: string | null
  title: string
  author: string
  body_markdown: string
}

export interface UpdateLifeGroupStudyRequest {
  image_url?: string | null
  title?: string
  author?: string
  body_markdown?: string
}

// Individually-granted publisher (beyond the fixed leadership roles).
export interface LifeGroupStudyPublisher {
  id: string
  user_id: number
  granted_by_id: string
  created_at: string
}

export interface CreateLifeGroupStudyPublisherRequest {
  user_id: number
}
