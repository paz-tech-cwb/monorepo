"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
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

interface LifeGroupAttendanceChartProps {
  showFilters?: boolean
  defaultFilters?: LifeGroupAnalyticsFilterState
}

export function LifeGroupAttendanceChart({
  showFilters = true,
  defaultFilters,
}: LifeGroupAttendanceChartProps) {
  const [filters, setFilters] = useState<LifeGroupAnalyticsFilterState>(
    defaultFilters ?? { year: new Date().getFullYear() }
  )

  const { data, isLoading, isError } = useLifeGroupAttendanceAnalytics({
    year: filters.year,
    month: filters.month,
    life_group_id: filters.lifeGroupId,
    granularity: filters.month ? "meeting" : "month",
  })

  const granularity = data?.granularity ?? "month"
  const rows = data?.rows ?? []
  const chartData = rows.map((row) => ({
    name: formatPeriodLabel(row.period, granularity),
    period: row.period,
    presentes: row.present_count,
    membros: row.members_count,
    taxa: Math.round(row.attendance_rate * 100),
  }))
  // Monthly rows are always zero-filled for all 12 months, so an empty
  // array never actually happens for that view — detect "no data at all"
  // by checking every row has zero meetings instead.
  const isEmpty = rows.every((row) => row.meetings_count === 0)

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
        {showFilters && (
          <LifeGroupAnalyticsFilters value={filters} onChange={setFilters} />
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
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="presentes" fill="#15803d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Reuniões</TableHead>
                    <TableHead className="text-right">Presentes</TableHead>
                    <TableHead className="text-right">Membros</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.period}>
                      <TableCell>{formatPeriodLabel(row.period, granularity)}</TableCell>
                      <TableCell className="text-right">{row.meetings_count}</TableCell>
                      <TableCell className="text-right">{row.present_count}</TableCell>
                      <TableCell className="text-right">{row.members_count}</TableCell>
                      <TableCell className="text-right">
                        {Math.round(row.attendance_rate * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
