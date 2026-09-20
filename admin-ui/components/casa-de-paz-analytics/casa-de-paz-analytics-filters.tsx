"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface CasaDePazFilterState {
  /** "YYYY-MM-DD" */
  from: string
  /** "YYYY-MM-DD" */
  to: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthsAgoIso(months: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - (months - 1))
  return d.toISOString().slice(0, 10)
}

export function defaultCasaDePazFilterState(): CasaDePazFilterState {
  return { from: monthsAgoIso(6), to: todayIso() }
}

interface CasaDePazAnalyticsFiltersProps {
  value: CasaDePazFilterState
  onChange: (value: CasaDePazFilterState) => void
}

export function CasaDePazAnalyticsFilters({ value, onChange }: CasaDePazAnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="casa-de-paz-from" className="text-xs">De</Label>
        <Input
          id="casa-de-paz-from"
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="w-[160px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="casa-de-paz-to" className="text-xs">Até</Label>
        <Input
          id="casa-de-paz-to"
          type="date"
          value={value.to}
          min={value.from}
          max={todayIso()}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="w-[160px]"
        />
      </div>
    </div>
  )
}
