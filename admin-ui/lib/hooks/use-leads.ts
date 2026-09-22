"use client"

import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "@/lib/api/endpoints/leads"

const QUERY_KEY = ["leads"]

export function useLeads() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => leadsApi.getAll(),
  })
}
