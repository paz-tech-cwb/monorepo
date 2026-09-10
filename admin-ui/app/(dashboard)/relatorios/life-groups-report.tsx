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
import { Baby, PieChart as PieChartIcon } from "lucide-react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"
import { useSectors } from "@/lib/hooks/use-sectors"
import { LifeGroupAttendanceChart } from "@/components/life-group-analytics/life-group-attendance-chart"
import { LifeGroupDistributionChart } from "@/components/life-group-analytics/life-group-distribution-chart"

const CHART_COLOR_COUNT = 5

const membersPerGroupChartConfig = {
  value: { label: "Membros", color: "var(--color-chart-2)" },
} satisfies ChartConfig

export function LifeGroupsReport() {
  const { data: lifeGroups = [], isLoading: lifeGroupsLoading } = useLifeGroups()
  const { data: sectors = [] } = useSectors()

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

  const totalKids = useMemo(
    () => lifeGroups.reduce((sum, g) => sum + (g.kids_count ?? 0), 0),
    [lifeGroups]
  )

  return (
    <div className="space-y-4">
      {/* Extra stat cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {lifeGroupsLoading ? (
          <StatsCardSkeleton />
        ) : (
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
        )}
      </div>

      {/* Attendance + distribution — backend-aggregated from the real
          life_group_attendance entries (mobile/admin attendance feature),
          not the generic life-group-reports form submissions. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LifeGroupAttendanceChart />
        <LifeGroupDistributionChart />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

        {/* Members per group */}
        <Card>
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
