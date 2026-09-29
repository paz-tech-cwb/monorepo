"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { casaDePazCyclesApi } from "@/lib/api/endpoints/casa-de-paz-cycles"
import type { CreateCasaDePazCycleRequest } from "@/lib/api/types"

const QUERY_KEY = ["casa-de-paz-cycles"]

export function useCasaDePazCycles() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => casaDePazCyclesApi.getAll(),
  })
}

export function useCreateCasaDePazCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCasaDePazCycleRequest) => casaDePazCyclesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useCloseCasaDePazCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => casaDePazCyclesApi.close(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
