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
import { Baby, PieChart as PieChartIcon, Users2, BarChart3 } from "lucide-react"
import { PieChart, Pie, Cell } from "recharts"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"
import { useSectors } from "@/lib/hooks/use-sectors"
import { useUsers } from "@/lib/hooks/use-users"
import { LifeGroupAttendanceChart } from "@/components/life-group-analytics/life-group-attendance-chart"
import { LifeGroupDistributionChart } from "@/components/life-group-analytics/life-group-distribution-chart"

const CHART_COLOR_COUNT = 5

export function LifeGroupsReport() {
  const { data: lifeGroups = [], isLoading: lifeGroupsLoading } = useLifeGroups()
  const { data: sectors = [] } = useSectors()
  const { data: allUsers = [], isLoading: usersLoading } = useUsers()

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

  const totalKids = useMemo(
    () => lifeGroups.reduce((sum, g) => sum + (g.kids_count ?? 0), 0),
    [lifeGroups]
  )

  // A per-group bar chart stops being readable well before a church has 60+
  // groups — the average scales to any number of groups instead.
  const avgMembersPerGroup = useMemo(
    () =>
      lifeGroups.length > 0
        ? Math.round((lifeGroups.reduce((sum, g) => sum + g.member_count, 0) / lifeGroups.length) * 10) / 10
        : 0,
    [lifeGroups]
  )

  const totalMembers = allUsers.length
  const membersInGroup = useMemo(
    () => allUsers.filter((u) => u.life_group_ids?.length > 0).length,
    [allUsers]
  )
  const membersWithoutGroup = totalMembers - membersInGroup
  const inGroupPercent = totalMembers > 0 ? Math.round((membersInGroup / totalMembers) * 100) : 0

  const membershipChartConfig = {
    "em-grupo": { label: "Em um grupo", color: "var(--color-chart-1)" },
    "sem-grupo": { label: "Sem grupo", color: "var(--color-chart-4)" },
  } satisfies ChartConfig

  const membershipData = [
    { key: "em-grupo", value: membersInGroup },
    { key: "sem-grupo", value: membersWithoutGroup },
  ]

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
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

        {lifeGroupsLoading ? (
          <StatsCardSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média por Grupo</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMembersPerGroup}</div>
              <p className="text-xs text-muted-foreground">membros por grupo, em média</p>
            </CardContent>
          </Card>
        )}

        {usersLoading ? (
          <StatsCardSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membros em Grupos</CardTitle>
              <Users2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {membersInGroup} <span className="text-sm font-normal text-muted-foreground">/ {totalMembers}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {inGroupPercent}% em grupo · {membersWithoutGroup} sem grupo
              </p>
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

        {/* Members in a group vs. not */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Membros com e sem Grupo
            </CardTitle>
            <CardDescription>Quantos membros da igreja já estão em um grupo de vida</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartContainer config={membershipChartConfig} className="aspect-auto h-[260px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                  <Pie
                    data={membershipData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="key"
                  >
                    {membershipData.map((entry) => (
                      <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
