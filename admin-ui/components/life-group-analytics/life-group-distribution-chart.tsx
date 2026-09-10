"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { useLifeGroupDistributionAnalytics } from "@/lib/hooks/use-life-group-analytics"
import type { LifeGroupDistributionBucket } from "@/lib/api/types"

const distributionChartConfig = {
  quantidade: { label: "Grupos", color: "var(--color-chart-2)" },
} satisfies ChartConfig

function DistributionBarChart({ data }: { data: LifeGroupDistributionBucket[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhum grupo de vida com esse dado cadastrado ainda.
      </p>
    )
  }
  return (
    <ChartContainer config={distributionChartConfig} className="aspect-auto h-[300px] w-full">
      <BarChart data={data.map((d) => ({ name: d.label, quantidade: d.count }))}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

// Always scoped to every life group — per-group filtering isn't useful
// here since the whole point is comparing groups against each other.
export function LifeGroupDistributionChart() {
  const { data, isLoading, isError } = useLifeGroupDistributionAnalytics({})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição dos Grupos de Vida</CardTitle>
        <CardDescription>Dia, horário e localização dos grupos</CardDescription>
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
