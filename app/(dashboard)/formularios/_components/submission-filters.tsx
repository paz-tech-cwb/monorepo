"use client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { FormSubmissionFilters } from "@/lib/api/types/formularios"

interface Props {
  value: FormSubmissionFilters
  onChange: (next: FormSubmissionFilters) => void
}

export function SubmissionFilters({ value, onChange }: Props) {
  const setText = (k: keyof FormSubmissionFilters, v: string) =>
    onChange({ ...value, [k]: v || undefined })
  const clear = () => onChange({})
  const hasAny = Object.values(value).some(Boolean)

  return (
    <div className="flex flex-wrap items-end gap-2 p-4 border-b">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">De</label>
        <Input
          type="date"
          className="w-36"
          value={value.start_date ?? ""}
          onChange={(e) => setText("start_date", e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Até</label>
        <Input
          type="date"
          className="w-36"
          value={value.end_date ?? ""}
          onChange={(e) => setText("end_date", e.target.value)}
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
