"use client"

import { useState } from "react"
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { useLifeGroupAttendanceAnalytics } from "@/lib/hooks/use-life-group-analytics"
import {
  LifeGroupAnalyticsFilters,
  type LifeGroupAnalyticsFilterState,
} from "./life-group-analytics-filters"

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

function formatPeriodLabel(period: string, granularity: "month" | "meeting"): string {
  if (granularity === "meeting") {
    const [, month, day] = period.split("-")
    return `${day}/${month}`
  }
  const [, month] = period.split("-")
  return MONTH_LABELS[Number(month) - 1] ?? period
}

const rateChartConfig = {
  taxa: { label: "Taxa de presença", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const countsChartConfig = {
  presentes: { label: "Presentes", color: "var(--color-chart-1)" },
  ausentes: { label: "Ausentes", color: "var(--color-chart-4)" },
} satisfies ChartConfig

interface LifeGroupAttendanceChartProps {
  /** Locks the chart to a single group and hides the (now year/month-only)
   * filters' relevance to "all groups" framing — used by the per-group
   * "Frequência" view opened from a life group's row menu. */
  lifeGroupId?: number
  /** "rate" (default) is the church-wide dashboard view — just the
   * attendance percentage trend. "counts" is the per-group detail view —
   * raw attendance vs. absence counts, which matter more once you're
   * looking at one specific group. */
  metric?: "rate" | "counts"
}

export function LifeGroupAttendanceChart({
  lifeGroupId,
  metric = "rate",
}: LifeGroupAttendanceChartProps) {
  const [filters, setFilters] = useState<LifeGroupAnalyticsFilterState>({
    year: new Date().getFullYear(),
  })

  const { data, isLoading, isError } = useLifeGroupAttendanceAnalytics({
    year: filters.year,
    month: filters.month,
    life_group_id: lifeGroupId,
    granularity: filters.month ? "meeting" : "month",
  })

  const granularity = data?.granularity ?? "month"
  const rows = data?.rows ?? []
  const chartData = rows.map((row) => ({
    name: formatPeriodLabel(row.period, granularity),
    presentes: row.present_count,
    ausentes: Math.max(row.members_count - row.present_count, 0),
    taxa: Math.round(row.attendance_rate * 100),
  }))
  // Monthly rows are always zero-filled for all 12 months, so an empty
  // array never actually happens for that view — detect "no data at all"
  // by checking every row has zero meetings instead.
  const isEmpty = rows.every((row) => row.meetings_count === 0)

  const totals = rows.reduce(
    (acc, row) => ({
      presentes: acc.presentes + row.present_count,
      ausentes: acc.ausentes + Math.max(row.members_count - row.present_count, 0),
    }),
    { presentes: 0, ausentes: 0 }
  )

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle>Frequência de Presença</CardTitle>
          <CardDescription>
            {filters.month
              ? "Presença por data de reunião no mês selecionado"
              : "Presença agregada por mês no ano selecionado"}
          </CardDescription>
        </div>
        <LifeGroupAnalyticsFilters value={filters} onChange={setFilters} />
        {metric === "counts" && !isLoading && !isError && !isEmpty && (
          <div className="flex gap-4 text-sm">
            <span>
              <span className="font-semibold text-foreground">{totals.presentes}</span>{" "}
              <span className="text-muted-foreground">presenças</span>
            </span>
            <span>
              <span className="font-semibold text-foreground">{totals.ausentes}</span>{" "}
              <span className="text-muted-foreground">ausências</span>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive py-8 text-center">
            Não foi possível carregar os dados de presença.
          </p>
        ) : isEmpty ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum registro de presença encontrado para o período selecionado.
          </p>
        ) : metric === "counts" ? (
          <ChartContainer config={countsChartConfig} className="aspect-auto h-[300px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="presentes" fill="var(--color-presentes)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ausentes" fill="var(--color-ausentes)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartContainer config={rateChartConfig} className="aspect-auto h-[300px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
              />
              <Bar dataKey="taxa" fill="var(--color-taxa)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
