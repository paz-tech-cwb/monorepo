"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
import { setAccessToken } from "@/lib/api/client"
import { trackLogin, trackLogout } from "@/lib/firebase/analytics"
import type { User } from "@/lib/api/types"

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (!fbUser) {
        setUser(null)
        setAccessToken(null)
        setIsLoading(false)
        return
      }

      try {
        const idToken = await fbUser.getIdToken()
        const provider = fbUser.providerData[0]?.providerId === "apple.com" ? "apple" : "google"
        const response = await authApi.socialLogin({
          idToken,
          provider,
        })

        setUser(response.user)
        setAccessToken(response.access_token)

        if (response.refresh_token) {
          localStorage.setItem("refresh_token", response.refresh_token)
        }
      } catch (error) {
        console.error("Failed to authenticate with backend:", error)
        setUser(null)
        setAccessToken(null)
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      await trackLogin("google")
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }, [])

  const loginWithApple = useCallback(async () => {
    setIsLoading(true)
    try {
      await signInWithApple()
      await trackLogin("apple")
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error("Backend logout failed:", error)
    }

    await firebaseSignOut()
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem("refresh_token")
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
