export type UserRole = "admin" | "moderator" | "user"
export type UserStatus = "active" | "inactive"

export interface AdminUser {
  id: number
  name: string
  email: string
  role: UserRole
  status: UserStatus
  avatar?: string
  created_at: string
  updated_at: string
}

export interface CreateUserRequest {
  name: string
  email: string
  role: UserRole
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: UserRole
  status?: UserStatus
  avatar?: string
}
