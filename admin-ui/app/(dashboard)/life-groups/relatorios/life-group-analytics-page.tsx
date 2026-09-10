"use client"

import { LifeGroupAttendanceChart } from "@/components/life-group-analytics/life-group-attendance-chart"
import { LifeGroupDistributionChart } from "@/components/life-group-analytics/life-group-distribution-chart"

export function LifeGroupAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios de Grupos de Vida</h1>
        <p className="text-muted-foreground">
          Presença e distribuição dos grupos de vida da igreja
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LifeGroupAttendanceChart />
        <LifeGroupDistributionChart />
      </div>
    </div>
  )
}
