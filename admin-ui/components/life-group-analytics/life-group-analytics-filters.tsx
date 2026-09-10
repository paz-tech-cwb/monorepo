"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)
const MONTH_OPTIONS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
]

export interface LifeGroupAnalyticsFilterState {
  year: number
  month?: number
  lifeGroupId?: number
}

interface LifeGroupAnalyticsFiltersProps {
  value: LifeGroupAnalyticsFilterState
  onChange: (value: LifeGroupAnalyticsFilterState) => void
  showYear?: boolean
  showMonth?: boolean
  showLifeGroup?: boolean
}

export function LifeGroupAnalyticsFilters({
  value,
  onChange,
  showYear = true,
  showMonth = true,
  showLifeGroup = true,
}: LifeGroupAnalyticsFiltersProps) {
  const { data: lifeGroups } = useLifeGroups()

  return (
    <div className="flex flex-wrap gap-2">
      {showYear && (
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
      )}

      {showMonth && (
        <Select
          value={value.month ? String(value.month) : "all"}
          onValueChange={(v) =>
            onChange({ ...value, month: v === "all" ? undefined : Number(v) })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MONTH_OPTIONS.map((month) => (
              <SelectItem key={month.value} value={String(month.value)}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showLifeGroup && (
        <Select
          value={value.lifeGroupId ? String(value.lifeGroupId) : "all"}
          onValueChange={(v) =>
            onChange({
              ...value,
              lifeGroupId: v === "all" ? undefined : Number(v),
            })
          }
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Grupo de Vida" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {(lifeGroups ?? []).map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
