"use client"
import { forwardRef, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { formatPhoneBR } from "@/lib/utils/phone"
import type { InputHTMLAttributes } from "react"

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string
  onChange?: (value: string) => void
}

function toDisplay(apiValue: string): string {
  const digits = apiValue.replace(/\D/g, "")
  const local = digits.startsWith("55") ? digits.slice(2) : digits
  return formatPhoneBR(local)
}

function toApi(display: string): string {
  const digits = display.replace(/\D/g, "")
  if (!digits) return ""
  return `+55${digits}`
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = "", onChange, ...props }, ref) => {
    const [display, setDisplay] = useState(() => toDisplay(value))

    useEffect(() => {
      setDisplay(toDisplay(value))
    }, [value])

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        inputMode="numeric"
        placeholder="(41) 99999-9999"
        value={display}
        onChange={(e) => {
          const formatted = formatPhoneBR(e.target.value)
          setDisplay(formatted)
          onChange?.(toApi(formatted))
        }}
      />
    )
  }
)
PhoneInput.displayName = "PhoneInput"
