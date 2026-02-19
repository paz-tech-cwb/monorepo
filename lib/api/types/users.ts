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
  phone_number?: string
  address?: string
  birth_date?: string
  life_group?: string
  role: UserRole
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  phone_number?: string
  address?: string
  birth_date?: string
  life_group?: string
  role?: UserRole
  status?: UserStatus
  avatar?: string
}

export interface UpdateUserRoleRequest {
  role: UserRole
}
