export type MemberStatus = "active" | "inactive"

export interface Member {
  id: number
  name: string
  email: string
  phone: string
  address?: string
  birth_date: string
  life_group?: string
  status: MemberStatus
  membership_date: string
  created_at: string
  updated_at: string
}

export interface CreateMemberRequest {
  name: string
  email: string
  phone: string
  address?: string
  birth_date: string
  life_group?: string
}

export interface UpdateMemberRequest {
  name?: string
  email?: string
  phone?: string
  address?: string
  birth_date?: string
  life_group?: string
  status?: MemberStatus
}
