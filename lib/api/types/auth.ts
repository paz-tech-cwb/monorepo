export interface User {
  id: number
  email: string
  name: string
  picture: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface SocialLoginRequest {
  id_token: string
  provider: "google" | "apple"
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
}
