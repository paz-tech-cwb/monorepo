"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sectorsApi } from "@/lib/api/endpoints/sectors"
import type { CreateSectorRequest, UpdateSectorRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["sectors"]

export function useSectors() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => sectorsApi.getAll(),
  })
}

export function useSector(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => sectorsApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateSector() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSectorRequest) => sectorsApi.create(data),
    onSuccess: (newSector) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("sector_created", { sector_id: newSector.id })
    },
  })
}

export function useUpdateSector() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSectorRequest }) =>
      sectorsApi.update(id, data),
    onSuccess: (updatedSector) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("sector_updated", { sector_id: updatedSector.id })
    },
  })
}

export function useDeleteSector() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => sectorsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("sector_deleted", { sector_id: id })
    },
  })
}
