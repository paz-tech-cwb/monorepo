"use client"
import { forwardRef, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import type { InputHTMLAttributes } from "react"

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value?: string
  onChange?: (value: string) => void
}

// yyyy-MM-dd → dd/MM/yyyy
function toDisplay(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

// dd/MM/yyyy → yyyy-MM-dd (only when complete)
function toIso(display: string): string {
  const digits = display.replace(/\D/g, "")
  if (digits.length !== 8) return ""
  const d = digits.slice(0, 2)
  const m = digits.slice(2, 4)
  const y = digits.slice(4, 8)
  return `${y}-${m}-${d}`
}

function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value = "", onChange, ...props }, ref) => {
    const [display, setDisplay] = useState(() => toDisplay(value))

    useEffect(() => {
      setDisplay(toDisplay(value))
    }, [value])

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={display}
        onChange={(e) => {
          const masked = applyMask(e.target.value)
          setDisplay(masked)
          const iso = toIso(masked)
          if (iso) onChange?.(iso)
          else if (!masked) onChange?.("")
        }}
      />
    )
  }
)
DateInput.displayName = "DateInput"
