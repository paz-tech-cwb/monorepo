export interface Member {
  id: number
  full_name: string
  birthday_date: string
  cellphone: string
  address?: string
  sector_id: number
  life_group_id: number
  leader_name?: string
  completed_courses?: number[]
  created_at: string
  updated_at: string
}

export interface CreateMemberRequest {
  full_name: string
  birthday_date: string
  cellphone: string
  address?: string
  sector_id: number
  life_group_id: number
  leader_name?: string
  completed_courses?: number[]
}

export interface UpdateMemberRequest {
  full_name?: string
  birthday_date?: string
  cellphone?: string
  address?: string
  sector_id?: number
  life_group_id?: number
  leader_name?: string
  completed_courses?: number[]
}
