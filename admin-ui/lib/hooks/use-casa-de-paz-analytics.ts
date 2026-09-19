"use client"

import { useQuery } from "@tanstack/react-query"
import { casaDePazAnalyticsApi } from "@/lib/api/endpoints/casa-de-paz-analytics"
import type { CasaDePazAnalyticsSummaryQuery } from "@/lib/api/types"

const QUERY_KEY = ["casa-de-paz-analytics"]

export function useCasaDePazSummary(query: CasaDePazAnalyticsSummaryQuery) {
  return useQuery({
    queryKey: [...QUERY_KEY, "summary", query],
    queryFn: () => casaDePazAnalyticsApi.getSummary(query),
  })
}

export function useCasaDePazSubmissions() {
  return useQuery({
    queryKey: [...QUERY_KEY, "submissions"],
    queryFn: () => casaDePazAnalyticsApi.getSubmissions(),
  })
}
