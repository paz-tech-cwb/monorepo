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

function GrowthBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null
  const percent = Math.round(value * 100)
  if (percent === 0) return <span className="text-xs text-muted-foreground">estável vs. período anterior</span>
  const positive = percent > 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}{percent}% vs. período anterior
    </span>
  )
}

export function CasaDePazReport() {
  const [filters, setFilters] = useState<CasaDePazFilterState>(defaultCasaDePazFilterState())

  const { data, isLoading, isError } = useCasaDePazSummary(filters)

  const totals = data?.totals
  const growth = data?.growth
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
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
            {isLoading || !totals ? (
              Array.from({ length: 7 }).map((_, i) => <StatsCardSkeleton key={i} />)
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
                    <GrowthBadge value={growth?.lives} />
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
                    <GrowthBadge value={growth?.houses} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Adultos</CardTitle>
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totals.adults}</div>
                    <p className="text-xs text-muted-foreground">presenças registradas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Crianças</CardTitle>
                    <Baby className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totals.kids}</div>
                    <p className="text-xs text-muted-foreground">presenças registradas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Convidados</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totals.guests}</div>
                    <p className="text-xs text-muted-foreground mb-1">novos convidados trazidos</p>
                    <GrowthBadge value={growth?.guests} />
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
                    <GrowthBadge value={growth?.conversions} />
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
            byTime={data?.by_time ?? []}
            isLoading={isLoading}
            isError={isError}
          />

          <CasaDePazTable filters={filters} range={data?.range} />
        </>
      )}
    </div>
  )
}
