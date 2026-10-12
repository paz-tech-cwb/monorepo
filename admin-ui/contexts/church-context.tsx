"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { useAuthContext } from "@/contexts/auth-context"

// ---------------------------------------------------------------------------
// Persisted selection -- avoids re-prompting the admin every page load
// ---------------------------------------------------------------------------

const CHURCH_STORAGE_KEY = "selected_church_id"

function persistSelectedChurchId(id: number | null) {
  if (typeof window === "undefined") return
  if (id !== null) {
    localStorage.setItem(CHURCH_STORAGE_KEY, String(id))
  } else {
    localStorage.removeItem(CHURCH_STORAGE_KEY)
  }
}

function restoreSelectedChurchId(): number | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(CHURCH_STORAGE_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface ChurchContextValue {
  // `null` while no filial has been resolved yet (auth still loading, or no
  // church association at all). Non-admin roles are always pinned to their
  // own primary filial — `setSelectedChurchId` is a no-op for them.
  selectedChurchId: number | null
  setSelectedChurchId: (id: number) => void
  // Only admins can switch filiais; other roles see no selector in the UI.
  canSwitchChurch: boolean
}

const ChurchContext = createContext<ChurchContextValue | null>(null)

interface ChurchProviderProps {
  children: ReactNode
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ChurchProvider({ children }: ChurchProviderProps) {
  const { user } = useAuthContext()
  const [selectedChurchId, setSelectedChurchIdState] = useState<number | null>(null)

  const canSwitchChurch = user?.role === "admin"

  // Non-admins are always pinned to their own primary filial.
  useEffect(() => {
    if (!user) {
      setSelectedChurchIdState(null)
      return
    }

    if (!canSwitchChurch) {
      setSelectedChurchIdState(user.church_id ?? null)
      return
    }

    const stored = restoreSelectedChurchId()
    setSelectedChurchIdState(stored ?? user.church_id ?? null)
  }, [user, canSwitchChurch])

  const setSelectedChurchId = useCallback(
    (id: number) => {
      if (!canSwitchChurch) return
      setSelectedChurchIdState(id)
      persistSelectedChurchId(id)
    },
    [canSwitchChurch]
  )

  const value: ChurchContextValue = {
    selectedChurchId,
    setSelectedChurchId,
    canSwitchChurch,
  }

  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>
}

export function useChurchContext(): ChurchContextValue {
  const context = useContext(ChurchContext)
  if (!context) {
    throw new Error("useChurchContext must be used within a ChurchProvider")
  }
  return context
}
