"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useCasaDePazSummary } from "@/lib/hooks/use-casa-de-paz-analytics"
import {
  CasaDePazAnalyticsFilters,
  defaultCasaDePazFilterState,
  type CasaDePazFilterState,
} from "@/components/casa-de-paz-analytics/casa-de-paz-analytics-filters"
import { CasaDePazTable } from "@/components/casa-de-paz-analytics/casa-de-paz-table"
import { CasaDePazStatCards } from "@/components/casa-de-paz-analytics/casa-de-paz-stat-cards"
import { formatComparisonLabel } from "@/components/casa-de-paz-analytics/growth-badge"

export function CasaDePazRegistrosManagement() {
  const [filters, setFilters] = useState<CasaDePazFilterState>(defaultCasaDePazFilterState())

  const { data, isLoading, isError } = useCasaDePazSummary(filters)

  const comparisonLabel = formatComparisonLabel(data?.comparison?.period)

  return (
    <div className="space-y-4">
      <CasaDePazAnalyticsFilters value={filters} onChange={setFilters} />

      {isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Não foi possível carregar os registros de Casa de Paz.
          </CardContent>
        </Card>
      ) : (
        <>
          <CasaDePazStatCards data={data} isLoading={isLoading} comparisonLabel={comparisonLabel} />

          <CasaDePazTable filters={filters} range={data?.range} />
        </>
      )}
    </div>
  )
}
