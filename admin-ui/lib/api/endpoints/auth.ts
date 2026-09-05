import { api, getRefreshToken } from "../client"
import type {
  AuthResponse,
  SocialLoginRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "../types"

interface MeResponse {
  id: number
  name: string
  email: string | null
  role: string | null
  avatar: string | null
}

export const authApi = {
  socialLogin: (data: SocialLoginRequest) =>
    api.post<AuthResponse>("/auth/social-login", data, { skipAuth: true }),

  refresh: (data: RefreshTokenRequest) =>
    api.post<RefreshTokenResponse>("/auth/refresh", data, { skipAuth: true }),

  // Re-fetches the current user's up-to-date role/profile — the cached
  // session user can go stale if an admin changes this user's role after
  // they last logged in, so callers must not trust the cache indefinitely.
  me: () => api.get<MeResponse>("/users/me"),

  logout: () => api.post<void>("/auth/logout", { refresh_token: getRefreshToken() }),
}
