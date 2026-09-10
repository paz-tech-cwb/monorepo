"use client"

import { useQuery } from "@tanstack/react-query"
import { lifeGroupAnalyticsApi } from "@/lib/api/endpoints/life-group-analytics"
import type { LifeGroupAttendanceQuery, LifeGroupDistributionQuery } from "@/lib/api/types"

const QUERY_KEY = ["life-group-analytics"]

export function useLifeGroupAttendanceAnalytics(query: LifeGroupAttendanceQuery) {
  return useQuery({
    queryKey: [...QUERY_KEY, "attendance", query],
    queryFn: () => lifeGroupAnalyticsApi.getAttendance(query),
  })
}

export function useLifeGroupDistributionAnalytics(query: LifeGroupDistributionQuery) {
  return useQuery({
    queryKey: [...QUERY_KEY, "distribution", query],
    queryFn: () => lifeGroupAnalyticsApi.getDistribution(query),
  })
}
