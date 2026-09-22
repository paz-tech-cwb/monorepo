"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import type { CasaDePazBySector, CasaDePazByDay } from "@/lib/api/types"

const sectorChartConfig = {
  casas: { label: "Casas de Paz", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const dayChartConfig = {
  casas: { label: "Casas de Paz", color: "var(--color-chart-2)" },
} satisfies ChartConfig

function EmptyState() {
  return (
    <p className="text-sm text-muted-foreground py-8 text-center">
      Nenhum dado disponível para o período selecionado.
    </p>
  )
}

function ErrorState() {
  return (
    <p className="text-sm text-destructive py-8 text-center">Não foi possível carregar os dados.</p>
  )
}

interface CasaDePazBreakdownChartsProps {
  bySector: CasaDePazBySector[]
  byDay: CasaDePazByDay[]
  isLoading: boolean
  isError: boolean
}

export function CasaDePazBreakdownCharts({
  bySector,
  byDay,
  isLoading,
  isError,
}: CasaDePazBreakdownChartsProps) {
  const sectorData = bySector.map((s) => ({ name: s.label, casas: s.houses }))
  const dayData = byDay.map((d) => ({ name: d.label, casas: d.houses }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Casas de Paz por Setor</CardTitle>
          <CardDescription>Volume de casas realizadas em cada setor</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : isError ? (
            <ErrorState />
          ) : sectorData.length === 0 ? (
            <EmptyState />
          ) : (
            <ChartContainer config={sectorChartConfig} className="aspect-auto h-[300px] w-full">
              <BarChart data={sectorData} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="casas" fill="var(--color-casas)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Casas de Paz por Dia</CardTitle>
          <CardDescription>Dia da semana em que os encontros acontecem</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : isError ? (
            <ErrorState />
          ) : dayData.length === 0 ? (
            <EmptyState />
          ) : (
            <ChartContainer config={dayChartConfig} className="aspect-auto h-[300px] w-full">
              <BarChart data={dayData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="casas" fill="var(--color-casas)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
