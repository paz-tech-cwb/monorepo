"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { casaDePazAnalyticsApi } from "@/lib/api/endpoints/casa-de-paz-analytics"
import type { CasaDePazAnalyticsSummaryQuery, UpdateCasaDePazReportRequest } from "@/lib/api/types"

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

export function useUpdateCasaDePazSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCasaDePazReportRequest }) =>
      casaDePazAnalyticsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteCasaDePazSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => casaDePazAnalyticsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
