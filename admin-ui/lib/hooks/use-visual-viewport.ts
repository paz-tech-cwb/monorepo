"use client"

import { useEffect, useRef, useState } from "react"

const KEYBOARD_THRESHOLD = 60

// Non-text <input> types that never trigger the on-screen keyboard.
// Mirrors vaul's `nonTextInputTypes` set (vaul/dist/index.mjs).
const NON_TEXT_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset",
])

// Mirrors vaul's `isInput` check (vaul/dist/index.mjs) so keyboard detection
// only triggers when a real text-entry element is focused.
function isInput(target: Element | null): boolean {
  if (!target) {
    return false
  }
  return (
    (target instanceof HTMLInputElement &&
      !NON_TEXT_INPUT_TYPES.has(target.type)) ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export interface VisualViewportState {
  supported: boolean
  height: number | null
  offsetTop: number | null
  keyboardInset: number
  isKeyboardOpen: boolean
}

const INITIAL_STATE: VisualViewportState = {
  supported: false,
  height: null,
  offsetTop: null,
  keyboardInset: 0,
  isKeyboardOpen: false,
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(INITIAL_STATE)
  const frameRef = useRef<number | null>(null)
  const prevRef = useRef<{ height: number | null; offsetTop: number | null }>({
    height: null,
    offsetTop: null,
  })

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return
    }

    const viewport = window.visualViewport

    const update = () => {
      frameRef.current = null

      const height = viewport.height
      const offsetTop = viewport.offsetTop

      const prev = prevRef.current
      const heightChanged =
        prev.height === null || Math.abs(prev.height - height) >= 1
      const offsetTopChanged =
        prev.offsetTop === null || Math.abs(prev.offsetTop - offsetTop) >= 1

      if (!heightChanged && !offsetTopChanged) {
        return
      }

      prevRef.current = { height, offsetTop }

      const keyboardInset = Math.max(
        0,
        window.innerHeight - height - offsetTop
      )
      // Only treat this as a keyboard event if a focusable input is active,
      // matching vaul's own heuristic (see isInput usage in vaul/dist/index.mjs).
      const isKeyboardOpen =
        keyboardInset > KEYBOARD_THRESHOLD && isInput(document.activeElement)

      setState({
        supported: true,
        height,
        offsetTop,
        keyboardInset,
        isKeyboardOpen,
      })
    }

    const scheduleUpdate = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = requestAnimationFrame(update)
    }

    scheduleUpdate()

    viewport.addEventListener("resize", scheduleUpdate)
    viewport.addEventListener("scroll", scheduleUpdate)

    return () => {
      viewport.removeEventListener("resize", scheduleUpdate)
      viewport.removeEventListener("scroll", scheduleUpdate)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  return state
}
