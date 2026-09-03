"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { churchApi } from "@/lib/api/endpoints/church"
import type { UpdateChurchRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["church"]

export function useChurch() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => churchApi.get(),
  })
}

export function useUpdateChurch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateChurchRequest) => churchApi.update(data),
    onSuccess: (church) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("church_updated", { church_id: church.id })
    },
  })
}
