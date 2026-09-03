"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api/endpoints/dashboard"

const QUERY_KEY = ["dashboard"]

export function useDashboardStats() {
  return useQuery({
    queryKey: [...QUERY_KEY, "stats"],
    queryFn: () => dashboardApi.getStats(),
  })
}

export function useAccessTrends() {
  return useQuery({
    queryKey: [...QUERY_KEY, "access-trends"],
    queryFn: () => dashboardApi.getAccessTrends(),
  })
}

export function useMemberGrowth() {
  return useQuery({
    queryKey: [...QUERY_KEY, "member-growth"],
    queryFn: () => dashboardApi.getMemberGrowth(),
  })
}

export function useLifeGroupDistribution() {
  return useQuery({
    queryKey: [...QUERY_KEY, "life-groups-distribution"],
    queryFn: () => dashboardApi.getLifeGroupDistribution(),
  })
}

