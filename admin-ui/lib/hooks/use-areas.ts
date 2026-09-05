"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { areasApi } from "@/lib/api/endpoints/areas"
import type { CreateAreaRequest, UpdateAreaRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["areas"]

export function useAreas() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => areasApi.getAll(),
  })
}

export function useArea(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => areasApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAreaRequest) => areasApi.create(data),
    onSuccess: (newArea) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("area_created", { area_id: newArea.id })
    },
  })
}

export function useUpdateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAreaRequest }) =>
      areasApi.update(id, data),
    onSuccess: (updatedArea) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("area_updated", { area_id: updatedArea.id })
    },
  })
}

export function useDeleteArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => areasApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("area_deleted", { area_id: id })
    },
  })
}
