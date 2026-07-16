export type UserRole =
  | "admin"
  | "pastor"
  | "area_leader"
  | "sector_leader"
  | "life_group_leader"
  | "member"
  // Legacy aliases kept for backwards compatibility with existing data
  | "supervisor"
  | "lg-leader"

export type UserStatus = "active" | "inactive"

export interface AdminUser {
  id: number
  name: string
  email: string
  phone_number?: string
  /** Legacy field — some responses may still use `phone` */
  phone?: string
  address?: string
  birth_date?: string
  role: UserRole
  status: UserStatus
  avatar?: string
  membership_date?: string
  sector_id?: number | null
  life_group_ids: number[]
  life_groups: { id: number; name: string }[]
  completed_courses?: number[]
  created_at: string
  updated_at: string
}

export interface UserAddressRequest {
  zip_code: string
  country: string
  state: string
  city: string
  neighborhood: string
  street: string
  number?: string | null
  complement?: string | null
}

export interface CreateUserRequest {
  name: string
  email: string
  phone?: string
  address?: UserAddressRequest
  birth_date?: string
  role: UserRole
  sector_id?: number | null
  completed_courses?: number[]
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  phone?: string
  birth_date?: string
  role?: UserRole
  status?: UserStatus
  avatar?: string
  sector_id?: number | null
  completed_courses?: number[]
}

export interface UpdateUserRoleRequest {
  role: UserRole
}

// Member-specific types (using /api/users endpoint)
export interface MemberUser {
  id: number
  full_name: string
  birthday_date: string
  cellphone: string
  address?: string
  sector_id: number | null
  life_group_ids: number[]
  life_groups: { id: number; name: string }[]
  leader_name?: string
  completed_courses?: number[]
  created_at: string
  updated_at: string
}

export interface CreateMemberUserRequest {
  full_name: string
  birthday_date: string
  cellphone: string
  address?: string
  sector_id: number
  life_group_ids: number[]
  leader_name?: string
  completed_courses?: number[]
}

export interface UpdateMemberUserRequest {
  full_name?: string
  birthday_date?: string
  cellphone?: string
  address?: string
  sector_id?: number
  life_group_ids?: number[]
  leader_name?: string
  completed_courses?: number[]
}
