"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/config"
import {
  signInWithGoogle,
  firebaseSignOut,
} from "@/lib/firebase/auth"
import { authApi } from "@/lib/api/endpoints/auth"
import {
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  setSessionCookie,
} from "@/lib/api/client"
import { trackLogin, trackLogout } from "@/lib/firebase/analytics"
import type { User } from "@/lib/api/types"

// ---------------------------------------------------------------------------
// Persisted user cache -- avoids flash of login page on page refresh
// ---------------------------------------------------------------------------

const USER_STORAGE_KEY = "auth_user"

function persistUser(user: User | null) {
  if (typeof window === "undefined") return
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_STORAGE_KEY)
  }
}

function restoreUser(): User | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null
  firebaseUser: FirebaseUser | null
  isLoading: boolean
  isAuthenticated: boolean
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loginInProgressRef = useRef(false)

  const backendAuthPromiseRef = useRef<Promise<void> | null>(null)
  const resolveBackendAuthRef = useRef<(() => void) | null>(null)
  const rejectBackendAuthRef = useRef<((err: Error) => void) | null>(null)

  // ---------------------------------------------------------------------------
  // On mount: restore tokens into memory
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const storedAccess = getAccessToken()
    const storedRefresh = getRefreshToken()
    const cachedUser = restoreUser()

    if (storedAccess) {
      setAccessToken(storedAccess)
    }
    if (storedRefresh) {
      setRefreshToken(storedRefresh)
    }
    if (storedAccess) {
      setSessionCookie()
    }
    if (cachedUser) {
      setUser(cachedUser)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Firebase auth listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      if (!fbUser) {
        setUser(null)
        persistUser(null)
        clearTokens()
        setIsLoading(false)
        return
      }

      const hasTokens = !!getAccessToken() && !!getRefreshToken()
      const cachedUser = restoreUser()

      if (hasTokens && cachedUser && !loginInProgressRef.current) {
        setUser(cachedUser)
        setIsLoading(false)
        // The cached user (including role) can go stale if an admin changes
        // it after this session started — refresh in the background so a
        // demoted/promoted user's permissions update without requiring a
        // manual re-login. Best-effort: a transient failure here shouldn't
        // interrupt an otherwise-valid session.
        authApi
          .me()
          .then((me) => {
            const refreshed: User = {
              ...cachedUser,
              name: me.name,
              email: me.email ?? cachedUser.email,
              picture: me.avatar ?? cachedUser.picture,
              role: (me.role as User["role"]) ?? null,
            }
            setUser(refreshed)
            persistUser(refreshed)
          })
          .catch(() => {
            /* keep the cached session; normal 401 handling covers real auth failures */
          })
        return
      }

      try {
        const idToken = await fbUser.getIdToken()
        const provider =
          fbUser.providerData[0]?.providerId === "apple.com"
            ? "apple"
            : "google"
        const response = await authApi.socialLogin({
          id_token: idToken,
          provider,
        })

        setUser(response.user)
        persistUser(response.user)
        setAccessToken(response.access_token)
        setRefreshToken(response.refresh_token)
        setSessionCookie()

        resolveBackendAuthRef.current?.()
      } catch (error) {
        console.error("Failed to authenticate with backend:", error)
        setUser(null)
        persistUser(null)
        clearTokens()

        rejectBackendAuthRef.current?.(
          error instanceof Error
            ? error
            : new Error("Backend authentication failed")
        )
      } finally {
        loginInProgressRef.current = false
        backendAuthPromiseRef.current = null
        resolveBackendAuthRef.current = null
        rejectBackendAuthRef.current = null
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // ---------------------------------------------------------------------------
  // Helper: creates a promise that resolves when the backend auth finishes
  // ---------------------------------------------------------------------------
  const startLoginFlow = useCallback(() => {
    loginInProgressRef.current = true
    backendAuthPromiseRef.current = new Promise<void>((resolve, reject) => {
      resolveBackendAuthRef.current = resolve
      rejectBackendAuthRef.current = reject
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Login helper
  // ---------------------------------------------------------------------------
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true)
    startLoginFlow()
    try {
      await signInWithGoogle()
      await trackLogin("google")
      await backendAuthPromiseRef.current
    } catch (error) {
      loginInProgressRef.current = false
      backendAuthPromiseRef.current = null
      resolveBackendAuthRef.current = null
      rejectBackendAuthRef.current = null
      setIsLoading(false)
      throw error
    }
  }, [startLoginFlow])

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error("Backend logout failed:", error)
    }

    await firebaseSignOut()
    setUser(null)
    persistUser(null)
    clearTokens()
    await trackLogout()
  }, [])

  const value: AuthContextValue = {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    loginWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}
