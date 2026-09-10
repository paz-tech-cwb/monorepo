"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useLifeGroupDistributionAnalytics } from "@/lib/hooks/use-life-group-analytics"
import {
  LifeGroupAnalyticsFilters,
  type LifeGroupAnalyticsFilterState,
} from "./life-group-analytics-filters"
import type { LifeGroupDistributionBucket } from "@/lib/api/types"

interface LifeGroupDistributionChartProps {
  showFilters?: boolean
}

function DistributionBarChart({ data }: { data: LifeGroupDistributionBucket[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhum grupo de vida com esse dado cadastrado ainda.
      </p>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.map((d) => ({ name: d.label, quantidade: d.count }))}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis className="text-xs" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LifeGroupDistributionChart({
  showFilters = true,
}: LifeGroupDistributionChartProps) {
  const [filters, setFilters] = useState<LifeGroupAnalyticsFilterState>({
    year: new Date().getFullYear(),
  })

  const { data, isLoading, isError } = useLifeGroupDistributionAnalytics({
    life_group_id: filters.lifeGroupId,
  })

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle>Distribuição dos Grupos de Vida</CardTitle>
          <CardDescription>Dia, horário e localização dos grupos</CardDescription>
        </div>
        {showFilters && (
          <LifeGroupAnalyticsFilters
            value={filters}
            onChange={setFilters}
            showYear={false}
            showMonth={false}
          />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive py-8 text-center">
            Não foi possível carregar os dados de distribuição.
          </p>
        ) : (
          <Tabs defaultValue="day">
            <TabsList>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="hour">Horário</TabsTrigger>
              <TabsTrigger value="neighborhood">Bairro</TabsTrigger>
              <TabsTrigger value="city">Cidade</TabsTrigger>
            </TabsList>
            <TabsContent value="day">
              <DistributionBarChart data={data?.by_day ?? []} />
            </TabsContent>
            <TabsContent value="hour">
              <DistributionBarChart data={data?.by_hour ?? []} />
            </TabsContent>
            <TabsContent value="neighborhood">
              <DistributionBarChart data={data?.by_neighborhood ?? []} />
            </TabsContent>
            <TabsContent value="city">
              <DistributionBarChart data={data?.by_city ?? []} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
