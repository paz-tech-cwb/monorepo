"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatsCardSkeleton } from "@/components/ui/skeleton-components"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Baby, CalendarClock, PieChart as PieChartIcon, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { useFormSubmissions } from "@/lib/hooks/use-form-submissions"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"
import { useSectors } from "@/lib/hooks/use-sectors"
import type { LifeGroupReport } from "@/lib/api/types/formularios"

const MEETING_DAYS_ORDER = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
  "Sem dia fixo",
] as const

const CHART_COLOR_COUNT = 5

const attendanceChartConfig = {
  presentes: { label: "Presentes", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const meetingDayChartConfig = {
  value: { label: "Grupos", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const membersPerGroupChartConfig = {
  value: { label: "Membros", color: "var(--color-chart-2)" },
} satisfies ChartConfig

// Reports come from the same 90-day window the mobile leader-facing reports
// screen surfaces — enough to show a meaningful attendance trend without
// pulling in the whole history for every group on every page load.
function ninetyDaysAgoISODate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}

export function LifeGroupsReport() {
  const { data: lifeGroups = [], isLoading: lifeGroupsLoading } = useLifeGroups()
  const { data: sectors = [] } = useSectors()
  const { data: reports, isLoading: reportsLoading } = useFormSubmissions<LifeGroupReport>(
    "life-group-reports",
    { start_date: ninetyDaysAgoISODate() }
  )

  const sectorMap = useMemo(() => new Map(sectors.map((s) => [s.id, s.name])), [sectors])

  const groupsBySector = useMemo(() => {
    const counts = new Map<string, number>()
    for (const g of lifeGroups) {
      const label = g.sector_id != null ? sectorMap.get(g.sector_id) ?? "Setor removido" : "Sem setor"
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, value], index) => ({
        key: `sector-${index}`,
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
  }, [lifeGroups, sectorMap])

  const sectorChartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    groupsBySector.forEach((item, index) => {
      cfg[item.key] = {
        label: item.name,
        color: `var(--color-chart-${(index % CHART_COLOR_COUNT) + 1})`,
      }
    })
    return cfg
  }, [groupsBySector])

  const membersPerGroup = useMemo(
    () =>
      [...lifeGroups]
        .sort((a, b) => b.member_count - a.member_count)
        .slice(0, 8)
        .map((g) => ({ name: g.name, value: g.member_count })),
    [lifeGroups]
  )

  const meetingDayDistribution = useMemo(() => {
    const counts = new Map<string, number>(MEETING_DAYS_ORDER.map((d) => [d, 0]))
    let undefinedCount = 0
    for (const g of lifeGroups) {
      if (g.meeting_day && counts.has(g.meeting_day)) {
        counts.set(g.meeting_day, (counts.get(g.meeting_day) ?? 0) + 1)
      } else if (!g.meeting_day) {
        undefinedCount += 1
      }
    }
    const rows: { name: string; value: number }[] = MEETING_DAYS_ORDER.map((name) => ({
      name,
      value: counts.get(name) ?? 0,
    }))
    if (undefinedCount > 0) rows.push({ name: "Não definido", value: undefinedCount })
    return rows
  }, [lifeGroups])

  const totalKids = useMemo(
    () => lifeGroups.reduce((sum, g) => sum + (g.kids_count ?? 0), 0),
    [lifeGroups]
  )

  const attendanceByDate = useMemo(() => {
    const byDate = new Map<string, { present: number; committed: number }>()
    for (const r of reports ?? []) {
      const key = r.date
      const entry = byDate.get(key) ?? { present: 0, committed: 0 }
      entry.present += r.committed_members_present ?? 0
      entry.committed += r.committed_members ?? 0
      byDate.set(key, entry)
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { present, committed }]) => ({
        name: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        presentes: present,
        comprometidos: committed,
      }))
  }, [reports])

  const attendanceRate = useMemo(() => {
    const totals = (reports ?? []).reduce(
      (acc, r) => ({
        present: acc.present + (r.committed_members_present ?? 0),
        committed: acc.committed + (r.committed_members ?? 0),
      }),
      { present: 0, committed: 0 }
    )
    return totals.committed > 0 ? Math.round((totals.present / totals.committed) * 100) : null
  }, [reports])

  return (
    <div className="space-y-4">
      {/* Extra stat cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {reportsLoading || lifeGroupsLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Crianças nos Grupos</CardTitle>
                <Baby className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalKids}</div>
                <p className="text-xs text-muted-foreground">crianças de 0 a 11 anos cadastradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Presença</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceRate != null ? `${attendanceRate}%` : "—"}</div>
                <p className="text-xs text-muted-foreground">últimos 90 dias, com base nos relatórios enviados</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Attendance trend */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Presença nos Encontros</CardTitle>
            <CardDescription>Comprometidos presentes por data de reunião, últimos 90 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : attendanceByDate.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                Nenhum relatório de grupo de vida enviado nos últimos 90 dias.
              </div>
            ) : (
              <ChartContainer config={attendanceChartConfig} className="aspect-auto h-[300px] w-full">
                <AreaChart data={attendanceByDate}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    type="monotone"
                    dataKey="presentes"
                    stroke="var(--color-presentes)"
                    fill="var(--color-presentes)"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Groups by sector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Grupos por Setor
            </CardTitle>
            <CardDescription>Distribuição dos grupos cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            {lifeGroupsLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
            <ChartContainer config={sectorChartConfig} className="aspect-auto h-[260px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                <Pie
                  data={groupsBySector}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="key"
                >
                  {groupsBySector.map((entry) => (
                    <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="key" />} />
              </PieChart>
            </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Meeting day distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Dia de Reunião
            </CardTitle>
            <CardDescription>Grupos por dia da semana</CardDescription>
          </CardHeader>
          <CardContent>
            {lifeGroupsLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
            <ChartContainer config={meetingDayChartConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={meetingDayDistribution} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Members per group */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Membros por Grupo</CardTitle>
            <CardDescription>8 maiores grupos de vida por número de membros</CardDescription>
          </CardHeader>
          <CardContent>
            {lifeGroupsLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : membersPerGroup.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                Nenhum grupo cadastrado ainda.
              </div>
            ) : (
              <ChartContainer config={membersPerGroupChartConfig} className="aspect-auto h-[260px] w-full">
                <BarChart data={membersPerGroup}>
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
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
