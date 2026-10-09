import { TrendingDown, TrendingUp } from "lucide-react"

const COMPARISON_MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
]

export function formatComparisonLabel(period: string | undefined): string {
  if (!period) return "vs. período anterior"
  const [year, month] = period.split("-")
  const label = COMPARISON_MONTH_LABELS[Number(month) - 1]
  if (!label) return "vs. período anterior"
  return `vs. ${label}/${year.slice(-2)}`
}

export function GrowthBadge({
  value,
  comparisonLabel,
}: {
  value: number | null | undefined
  comparisonLabel: string
}) {
  if (value === null || value === undefined) return null
  const percent = Math.round(value * 100)
  if (percent === 0) return <span className="text-xs text-muted-foreground">estável {comparisonLabel}</span>
  const positive = percent > 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}{percent}% {comparisonLabel}
    </span>
  )
}
