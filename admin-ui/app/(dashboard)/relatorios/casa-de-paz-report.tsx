"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCardSkeleton } from "@/components/ui/skeleton-components"
import { Home, Users2, Baby, UserPlus, Sparkles, Percent } from "lucide-react"
import { useCasaDePazSummary } from "@/lib/hooks/use-casa-de-paz-analytics"
import {
  CasaDePazAnalyticsFilters,
  type CasaDePazFilterState,
} from "@/components/casa-de-paz-analytics/casa-de-paz-analytics-filters"
import { CasaDePazTrendChart } from "@/components/casa-de-paz-analytics/casa-de-paz-trend-chart"
import { CasaDePazBreakdownCharts } from "@/components/casa-de-paz-analytics/casa-de-paz-breakdown-charts"
import { CasaDePazTable } from "@/components/casa-de-paz-analytics/casa-de-paz-table"

export function CasaDePazReport() {
  const [filters, setFilters] = useState<CasaDePazFilterState>({
    year: new Date().getFullYear(),
    months: 6,
  })

  const { data, isLoading, isError } = useCasaDePazSummary(filters)

  const totals = data?.totals
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
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {isLoading || !totals ? (
              Array.from({ length: 6 }).map((_, i) => <StatsCardSkeleton key={i} />)
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Casas de Paz</CardTitle>
                    <Home className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totals.houses}</div>
                    <p className="text-xs text-muted-foreground">realizadas no período</p>
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
                    <p className="text-xs text-muted-foreground">novos convidados trazidos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totals.conversions}</div>
                    <p className="text-xs text-muted-foreground">decisões registradas</p>
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
