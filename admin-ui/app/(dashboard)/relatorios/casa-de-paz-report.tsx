"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCardSkeleton } from "@/components/ui/skeleton-components"
import { Home, Users2, Baby, UserPlus, Sparkles, Percent, HeartHandshake, TrendingUp, TrendingDown } from "lucide-react"
import { useCasaDePazSummary } from "@/lib/hooks/use-casa-de-paz-analytics"
import {
  CasaDePazAnalyticsFilters,
  defaultCasaDePazFilterState,
  type CasaDePazFilterState,
} from "@/components/casa-de-paz-analytics/casa-de-paz-analytics-filters"
import { CasaDePazTrendChart } from "@/components/casa-de-paz-analytics/casa-de-paz-trend-chart"
import { CasaDePazBreakdownCharts } from "@/components/casa-de-paz-analytics/casa-de-paz-breakdown-charts"
import { CasaDePazTable } from "@/components/casa-de-paz-analytics/casa-de-paz-table"

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

function formatComparisonLabel(period: string | undefined): string {
  if (!period) return "vs. período anterior"
  const [year, month] = period.split("-")
  const label = COMPARISON_MONTH_LABELS[Number(month) - 1]
  if (!label) return "vs. período anterior"
  return `vs. ${label}/${year.slice(-2)}`
}

function GrowthBadge({
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

export function CasaDePazReport() {
  const [filters, setFilters] = useState<CasaDePazFilterState>(defaultCasaDePazFilterState())

  const { data, isLoading, isError } = useCasaDePazSummary(filters)

  const totals = data?.totals
  const growth = data?.growth
  const comparisonLabel = formatComparisonLabel(data?.comparison?.period)
  const conversionRatePercent = totals ? Math.round(totals.conversion_rate * 100) : 0

  return (
    <div className="space-y-4">
      <CasaDePazAnalyticsFilters value={filters} onChange={setFilters} />

      {isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Não foi possível carregar o relatório de Casa de Paz.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {isLoading || !totals ? (
              Array.from({ length: 5 }).map((_, i) => <StatsCardSkeleton key={i} />)
            ) : (
              <>
                <Card className="border-primary/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vidas Alcançadas</CardTitle>
                    <HeartHandshake className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totals.lives}</div>
                    <p className="text-xs text-muted-foreground mb-1">adultos + crianças + convidados</p>
                    <GrowthBadge value={growth?.lives} comparisonLabel={comparisonLabel} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Casas de Paz</CardTitle>
                    <Home className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totals.houses}</div>
                    <p className="text-xs text-muted-foreground mb-1">realizadas no período</p>
                    <GrowthBadge value={growth?.houses} comparisonLabel={comparisonLabel} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Presenças</CardTitle>
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users2 className="h-3 w-3" /> Adultos
                      </span>
                      <span className="font-semibold">{totals.adults}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Baby className="h-3 w-3" /> Crianças
                      </span>
                      <span className="font-semibold">{totals.kids}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <UserPlus className="h-3 w-3" /> Convidados
                      </span>
                      <span className="font-semibold">{totals.guests}</span>
                    </div>
                    <GrowthBadge value={growth?.guests} comparisonLabel={comparisonLabel} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totals.conversions}</div>
                    <p className="text-xs text-muted-foreground mb-1">decisões registradas</p>
                    <GrowthBadge value={growth?.conversions} comparisonLabel={comparisonLabel} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{conversionRatePercent}%</div>
                    <p className="text-xs text-muted-foreground">conversões sobre convidados</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <CasaDePazTrendChart series={data?.series ?? []} isLoading={isLoading} isError={isError} />

          <CasaDePazBreakdownCharts
            bySector={data?.by_sector ?? []}
            byDay={data?.by_day ?? []}
            isLoading={isLoading}
            isError={isError}
          />

          <CasaDePazTable filters={filters} range={data?.range} />
        </>
      )}
    </div>
  )
}
