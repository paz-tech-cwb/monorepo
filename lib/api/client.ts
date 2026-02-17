import { apiConfig } from "./config"

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

interface RequestOptions {
  method?: RequestMethod
  body?: unknown
  headers?: Record<string, string>
  skipAuth?: boolean
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`API Error: ${status} ${statusText}`)
    this.name = "ApiError"
  }
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

const TOKEN_KEYS = {
  access: "access_token",
  refresh: "refresh_token",
} as const

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

let memoryAccessToken: string | null = null

export function setAccessToken(token: string | null) {
  memoryAccessToken = token
  if (isBrowser()) {
    if (token) {
      localStorage.setItem(TOKEN_KEYS.access, token)
    } else {
      localStorage.removeItem(TOKEN_KEYS.access)
    }
  }
}

export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken
  if (isBrowser()) {
    const stored = localStorage.getItem(TOKEN_KEYS.access)
    if (stored) {
      memoryAccessToken = stored
    }
    return stored
  }
  return null
}

export function setRefreshToken(token: string | null) {
  if (isBrowser()) {
    if (token) {
      localStorage.setItem(TOKEN_KEYS.refresh, token)
    } else {
      localStorage.removeItem(TOKEN_KEYS.refresh)
    }
  }
}

export function getRefreshToken(): string | null {
  if (isBrowser()) {
    return localStorage.getItem(TOKEN_KEYS.refresh)
  }
  return null
}

export function clearTokens() {
  memoryAccessToken = null
  if (isBrowser()) {
    localStorage.removeItem(TOKEN_KEYS.access)
    localStorage.removeItem(TOKEN_KEYS.refresh)
    localStorage.removeItem("auth_user")
    // Remove the session cookie used by middleware
    document.cookie = "auth_session=; path=/; max-age=0"
  }
}

/** Sets a lightweight cookie so the Next.js middleware knows a session exists. */
export function setSessionCookie() {
  if (isBrowser()) {
    // Cookie lives for 30 days -- it is just a flag, not a secret.
    const secure =
      window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `auth_session=1; path=/; max-age=2592000; SameSite=Lax${secure}`
  }
}

// ---------------------------------------------------------------------------
// Token refresh logic (mutex to prevent concurrent refreshes)
// ---------------------------------------------------------------------------

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refresh_token = getRefreshToken()
  if (!refresh_token) return false

  try {
    const url = `${apiConfig.apiBaseUrl}/auth/refresh`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    })

    if (!response.ok) {
      // Refresh token is dead -- clear it so we don't keep retrying
      clearTokens()
      return false
    }

    const data: { access_token: string; refresh_token: string } =
      await response.json()

    setAccessToken(data.access_token)
    setRefreshToken(data.refresh_token)
    setSessionCookie()

    return true
  } catch {
    // Network error during refresh -- clear tokens to force re-login
    clearTokens()
    return false
  }
}

/**
 * Ensures only one refresh request is in-flight at a time.
 * All concurrent callers share the same promise.
 */
function refreshTokenOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// ---------------------------------------------------------------------------
// Redirect helper
// ---------------------------------------------------------------------------

function redirectToLogin() {
  clearTokens()
  if (isBrowser()) {
    window.location.href = "/"
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function executeFetch<T>(
  url: string,
  method: RequestMethod,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ response: Response; data: T | undefined }> {
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return { response, data: undefined }
  }

  if (!response.ok) {
    let errorData: unknown
    try {
      errorData = await response.json()
    } catch {
      errorData = null
    }
    throw new ApiError(response.status, response.statusText, errorData)
  }

  const data = (await response.json()) as T
  return { response, data }
}

// ---------------------------------------------------------------------------
// Public API client
// ---------------------------------------------------------------------------

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, skipAuth = false } = options

  const url = `${apiConfig.apiBaseUrl}${endpoint}`

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    }
    const token = getAccessToken()
    if (!skipAuth && token) {
      h["Authorization"] = `Bearer ${token}`
    }
    return h
  }

  try {
    const { data } = await executeFetch<T>(url, method, buildHeaders(), body)
    return data as T
  } catch (error) {
    // Only attempt refresh on 401 for authenticated requests
    if (error instanceof ApiError && error.status === 401 && !skipAuth) {
      const refreshed = await refreshTokenOnce()

      if (refreshed) {
        // Retry the original request with the new access token
        try {
          const { data } = await executeFetch<T>(
            url,
            method,
            buildHeaders(),
            body
          )
          return data as T
        } catch (retryError) {
          // If retry also returns 401, give up and redirect
          if (
            retryError instanceof ApiError &&
            retryError.status === 401
          ) {
            redirectToLogin()
          }
          throw retryError
        }
      } else {
        // Refresh failed -- session is dead
        redirectToLogin()
      }
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "DELETE" }),
}
