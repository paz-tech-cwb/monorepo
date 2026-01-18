import { api } from "../client"
import type {
  AuthResponse,
  SocialLoginRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "../types"

export const authApi = {
  socialLogin: (data: SocialLoginRequest) =>
    api.post<AuthResponse>("/auth/social-login", data, { skipAuth: true }),

  refresh: (data: RefreshTokenRequest) =>
    api.post<RefreshTokenResponse>("/auth/refresh", data, { skipAuth: true }),

  logout: () => api.post<void>("/auth/logout"),
}
