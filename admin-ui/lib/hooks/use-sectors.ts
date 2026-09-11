"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sectorsApi } from "@/lib/api/endpoints/sectors"
import type { CreateSectorRequest, UpdateSectorRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["sectors"]
const AREAS_HIERARCHY_QUERY_KEY = ["areas", "hierarchy"]
const AREAS_QUERY_KEY = ["areas"]

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

function invalidateOrganizationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  queryClient.invalidateQueries({ queryKey: AREAS_HIERARCHY_QUERY_KEY })
  queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY })
}

export function useCreateSector() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSectorRequest) => sectorsApi.create(data),
    onSuccess: (newSector) => {
      invalidateOrganizationQueries(queryClient)
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
      invalidateOrganizationQueries(queryClient)
      trackEvent("sector_updated", { sector_id: updatedSector.id })
    },
  })
}

export function useDeleteSector() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => sectorsApi.delete(id),
    onSuccess: (_, id) => {
      invalidateOrganizationQueries(queryClient)
      trackEvent("sector_deleted", { sector_id: id })
    },
  })
}
