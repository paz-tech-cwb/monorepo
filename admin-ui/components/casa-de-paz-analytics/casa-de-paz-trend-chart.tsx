"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ComposedChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts"
import type { CasaDePazSeriesPoint } from "@/lib/api/types"

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
]

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-")
  const label = MONTH_LABELS[Number(month) - 1]
  if (!label) return period
  return `${label}/${year.slice(-2)}`
}

const activityChartConfig = {
  casas: { label: "Casas de Paz", color: "var(--color-chart-1)" },
  criancas: { label: "Crianças", color: "var(--color-chart-3)" },
} satisfies ChartConfig

const conversionChartConfig = {
  convidados: { label: "Convidados", color: "var(--color-chart-2)" },
  conversoes: { label: "Conversões", color: "var(--color-chart-4)" },
} satisfies ChartConfig

interface CasaDePazTrendChartProps {
  series: CasaDePazSeriesPoint[]
  isLoading: boolean
  isError: boolean
}

export function CasaDePazTrendChart({ series, isLoading, isError }: CasaDePazTrendChartProps) {
  const isEmpty = series.length === 0 || series.every((row) => row.houses === 0)

  const activityData = series.map((row) => ({
    name: formatPeriodLabel(row.period),
    casas: row.houses,
    criancas: row.kids,
  }))

  const conversionData = series.map((row) => ({
    name: formatPeriodLabel(row.period),
    convidados: row.guests,
    conversoes: row.conversions,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Atividade das Casas de Paz</CardTitle>
          <CardDescription>Casas realizadas e pessoas presentes por período</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : isError ? (
            <p className="text-sm text-destructive py-8 text-center">
              Não foi possível carregar os dados de atividade.
            </p>
          ) : isEmpty ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma Casa de Paz registrada no período selecionado.
            </p>
          ) : (
            <ChartContainer config={activityChartConfig} className="aspect-auto h-[300px] w-full">
              <ComposedChart data={activityData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="casas" fill="var(--color-casas)" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="criancas"
                  stroke="var(--color-criancas)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aderência de Novas Pessoas</CardTitle>
          <CardDescription>Convidados trazidos e conversões por período</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : isError ? (
            <p className="text-sm text-destructive py-8 text-center">
              Não foi possível carregar os dados de conversão.
            </p>
          ) : isEmpty ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma Casa de Paz registrada no período selecionado.
            </p>
          ) : (
            <ChartContainer config={conversionChartConfig} className="aspect-auto h-[300px] w-full">
              <LineChart data={conversionData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="convidados"
                  stroke="var(--color-convidados)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="conversoes"
                  stroke="var(--color-conversoes)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
