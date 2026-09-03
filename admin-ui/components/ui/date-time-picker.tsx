"use client"

import { useEffect, useState } from "react"
import { format, isValid, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  label: string
  /** ISO value e.g. "2026-06-08T19:30" or "" */
  value: string
  onChange: (iso: string) => void
  optional?: boolean
}

function applyTimeMask(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}:${d.slice(2)}`
}

function parseIso(iso: string): { date: Date | undefined; time: string } {
  if (!iso) return { date: undefined, time: "" }
  const [datePart = "", timePart = ""] = iso.split("T")
  const d = parse(datePart, "yyyy-MM-dd", new Date())
  return { date: isValid(d) ? d : undefined, time: timePart.slice(0, 5) }
}

function buildIso(date: Date | undefined, time: string): string {
  if (!date) return ""
  const datePart = format(date, "yyyy-MM-dd")
  const digits = time.replace(/\D/g, "")
  if (digits.length === 4) {
    return `${datePart}T${digits.slice(0, 2)}:${digits.slice(2, 4)}:00`
  }
  return `${datePart}T00:00:00`
}

export function DateTimePicker({ label, value, onChange, optional = false }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const { date, time: initialTime } = parseIso(value)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date)
  const [timeDisplay, setTimeDisplay] = useState(initialTime)

  // Sync when parent resets
  useEffect(() => {
    const { date: d, time: t } = parseIso(value)
    setSelectedDate(d)
    setTimeDisplay(t)
  }, [value])

  const handleDaySelect = (day: Date | undefined) => {
    setSelectedDate(day)
    onChange(buildIso(day, timeDisplay))
    setOpen(false)
  }

  const handleTimeChange = (raw: string) => {
    const masked = applyTimeMask(raw)
    setTimeDisplay(masked)
    onChange(buildIso(selectedDate, masked))
  }

  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {optional && <span className="text-muted-foreground ml-1 text-xs">(opcional)</span>}
      </Label>
      <div className="flex gap-2 items-center">
        {/* Date picker */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="flex-1 justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              {selectedDate ? (
                format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                <span className="text-muted-foreground">dd/mm/aaaa</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              {...({
                mode: "single",
                selected: selectedDate,
                onSelect: handleDaySelect,
                locale: ptBR,
                defaultMonth: selectedDate,
                initialFocus: true,
              } as React.ComponentProps<typeof Calendar>)}
            />
          </PopoverContent>
        </Popover>

        {/* Time — 24h masked text input */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground shrink-0">às</span>
          <Input
            value={timeDisplay}
            onChange={(e) => handleTimeChange(e.target.value)}
            placeholder="HH:MM"
            inputMode="numeric"
            maxLength={5}
            className="w-24 text-center"
          />
        </div>
      </div>
    </div>
  )
}
