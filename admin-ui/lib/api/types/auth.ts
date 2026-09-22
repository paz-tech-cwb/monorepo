export type AdminRole =
  | "admin"
  | "pastor"
  | "area_leader"
  | "sector_leader"
  | "life_group_leader"
  | "discipler"

export interface User {
  id: number
  email: string
  name: string
  picture: string
  role: AdminRole | "member" | "lead" | null
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface SocialLoginRequest {
  id_token: string
  provider: "google" | "apple"
  client: "admin"
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
}
