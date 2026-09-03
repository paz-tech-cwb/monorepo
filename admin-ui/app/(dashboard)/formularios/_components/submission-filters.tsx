"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { X } from "lucide-react"
import { format } from "date-fns"
import type { FormSubmissionFilters } from "@/lib/api/types/formularios"

interface Props {
  value: FormSubmissionFilters
  onChange: (next: FormSubmissionFilters) => void
}

export function SubmissionFilters({ value, onChange }: Props) {
  const todayIso = format(new Date(), "yyyy-MM-dd")

  // Default both dates to today on first render
  useEffect(() => {
    if (!value.start_date && !value.end_date) {
      onChange({ ...value, start_date: todayIso, end_date: todayIso })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: keyof FormSubmissionFilters, v: string) =>
    onChange({ ...value, [k]: v || undefined })
  const clear = () => onChange({})
  const hasAny = Object.values(value).some(Boolean)

  return (
    <div className="flex flex-wrap items-end gap-2 px-2 py-4 border-b">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground block">De</label>
        <DatePickerInput
          className="w-40"
          value={value.start_date ?? ""}
          onChange={(v) => set("start_date", v)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground block">Até</label>
        <DatePickerInput
          className="w-40"
          value={value.end_date ?? ""}
          onChange={(v) => set("end_date", v)}
        />
      </div>
      {hasAny && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="size-4 mr-1" /> Limpar
        </Button>
      )}
    </div>
  )
}
