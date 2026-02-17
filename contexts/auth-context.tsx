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
  signInWithApple,
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
  loginWithApple: () => Promise<void>
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
  // Eagerly restore user from localStorage so isAuthenticated is true on mount
  const [user, setUser] = useState<User | null>(() => restoreUser())
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Track whether a social-login popup is in progress so onAuthStateChanged
  // knows to call the backend (vs. silently restoring on page refresh).
  const loginInProgressRef = useRef(false)

  // Promise that the login helpers can await so router.push only fires
  // after the backend has responded and tokens are stored.
  const backendAuthPromiseRef = useRef<Promise<void> | null>(null)
  const resolveBackendAuthRef = useRef<(() => void) | null>(null)
  const rejectBackendAuthRef = useRef<((err: Error) => void) | null>(null)

  // ---------------------------------------------------------------------------
  // On mount: restore tokens into memory
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const storedAccess = getAccessToken()
    const storedRefresh = getRefreshToken()

    if (storedAccess) {
      setAccessToken(storedAccess)
    }
    if (storedRefresh) {
      setRefreshToken(storedRefresh)
    }
    if (storedAccess) {
      setSessionCookie()
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
        // User signed out of Firebase
        setUser(null)
        persistUser(null)
        clearTokens()
        setIsLoading(false)
        return
      }

      // Decide whether we need to call the backend:
      // - If a login popup just completed (loginInProgressRef), always call
      // - If we have no stored tokens, we must call to get them
      // - If we already have valid tokens + cached user, skip the backend call
      const hasTokens = !!getAccessToken() && !!getRefreshToken()
      const cachedUser = restoreUser()

      if (hasTokens && cachedUser && !loginInProgressRef.current) {
        // Session is already valid from a previous visit -- just hydrate state
        setUser(cachedUser)
        setIsLoading(false)
        return
      }

      // Call the backend to exchange Firebase token for app tokens
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

        // Resolve the promise that loginWithGoogle/loginWithApple is awaiting
        resolveBackendAuthRef.current?.()
      } catch (error) {
        console.error("Failed to authenticate with backend:", error)
        setUser(null)
        persistUser(null)
        clearTokens()

        // Reject so the login form can show an error
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
  // Login helpers -- now awaitable through the full flow
  // ---------------------------------------------------------------------------
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true)
    startLoginFlow()
    try {
      await signInWithGoogle()
      await trackLogin("google")
      // Wait for onAuthStateChanged -> socialLogin -> token storage to finish
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

  const loginWithApple = useCallback(async () => {
    setIsLoading(true)
    startLoginFlow()
    try {
      await signInWithApple()
      await trackLogin("apple")
      // Wait for onAuthStateChanged -> socialLogin -> token storage to finish
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
    loginWithApple,
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
