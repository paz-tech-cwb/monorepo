"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { conversionsApi } from "@/lib/api/endpoints/conversions"
import type { CreateConversionRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["conversions"]

export function useConversions() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => conversionsApi.getAll(),
  })
}

export function useConversion(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => conversionsApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateConversion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateConversionRequest) => conversionsApi.create(data),
    onSuccess: (newConversion) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("conversion_created", {
        conversion_id: newConversion.id,
        type: newConversion.type,
      })
    },
  })
}

export function useDeleteConversion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => conversionsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("conversion_deleted", { conversion_id: id })
    },
  })
}
