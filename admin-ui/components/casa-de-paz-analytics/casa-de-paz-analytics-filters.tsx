"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

const PERIOD_OPTIONS = [
  { value: 3, label: "Últimos 3 meses" },
  { value: 6, label: "Últimos 6 meses" },
  { value: 9, label: "Últimos 9 meses" },
  { value: 12, label: "Últimos 12 meses" },
] as const

export interface CasaDePazFilterState {
  year: number
  months: 3 | 6 | 9 | 12
}

interface CasaDePazAnalyticsFiltersProps {
  value: CasaDePazFilterState
  onChange: (value: CasaDePazFilterState) => void
}

export function CasaDePazAnalyticsFilters({ value, onChange }: CasaDePazAnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={String(value.year)}
        onValueChange={(v) => onChange({ ...value, year: Number(v) })}
      >
        <SelectTrigger className="w-[110px]">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          {YEAR_OPTIONS.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(value.months)}
        onValueChange={(v) => onChange({ ...value, months: Number(v) as 3 | 6 | 9 | 12 })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((period) => (
            <SelectItem key={period.value} value={String(period.value)}>
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
