export interface LifeGroupMember {
  id: number
  name: string
  email: string
}

export interface LifeGroup {
  id: number
  name: string
  location: string | null
  meeting_day: string | null
  meeting_time: string | null
  leader_id: number | null
  leader_name: string | null
  sector_id: number | null
  member_count: number
  members: LifeGroupMember[]
  created_at: string
  updated_at: string
}

export interface CreateLifeGroupRequest {
  name: string
  location?: string | null
  meeting_day?: string | null
  meeting_time?: string | null
  leader_id?: number | null
  sector_id?: number | null
}

export type UpdateLifeGroupRequest = Partial<CreateLifeGroupRequest>
