export type UserRole = "admin" | "pastor" | "supervisor" | "lg-leader" | "member"
export type UserStatus = "active" | "inactive"

export interface AdminUser {
  id: number
  name: string
  email: string
  phone?: string
  address?: string
  birth_date?: string
  life_group?: string
  role: UserRole
  status: UserStatus
  avatar?: string
  membership_date?: string
  created_at: string
  updated_at: string
}

export interface CreateUserRequest {
  name: string
  email: string
  phone?: string
  address?: string
  birth_date?: string
  life_group?: string
  role: UserRole
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  phone?: string
  address?: string
  birth_date?: string
  life_group?: string
  role?: UserRole
  status?: UserStatus
  avatar?: string
}
