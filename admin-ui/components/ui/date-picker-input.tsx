"use client"
import { useState } from "react"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerInputProps {
  value?: string           // ISO yyyy-MM-dd
  onChange?: (iso: string) => void
  className?: string
  disabled?: boolean
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const d = parse(iso, "yyyy-MM-dd", new Date())
  return isValid(d) ? d : undefined
}

export function DatePickerInput({ value = "", onChange, className, disabled }: DatePickerInputProps) {
  const [open, setOpen] = useState(false)
  const selected = isoToDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("justify-start font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selected ? format(selected, "dd/MM/yyyy") : "dd/mm/aaaa"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange?.(d ? format(d, "yyyy-MM-dd") : "")
            setOpen(false)
          }}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
