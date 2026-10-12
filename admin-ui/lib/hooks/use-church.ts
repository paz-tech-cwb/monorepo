"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { churchApi } from "@/lib/api/endpoints/church"
import type { CreateChurchRequest, UpdateChurchRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["church"]
const LIST_QUERY_KEY = ["churches"]

// With no `id`, resolves to the legacy bare `GET /church` (the requester's
// primary filial) — kept for callers that only know about a single church.
// With an `id`, fetches that specific filial via `GET /church/:id`.
export function useChurch(id?: number) {
  return useQuery({
    queryKey: id ? [...QUERY_KEY, id] : QUERY_KEY,
    queryFn: () => (id ? churchApi.getById(id) : churchApi.get()),
  })
}

export function useChurches() {
  return useQuery({
    queryKey: LIST_QUERY_KEY,
    queryFn: () => churchApi.list(),
  })
}

export function useCreateChurch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChurchRequest) => churchApi.create(data),
    onSuccess: (church) => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY })
      trackEvent("church_created", { church_id: church.id })
    },
  })
}

// With no `id`, updates via the legacy bare `PUT /church` (the requester's
// primary filial). With an `id`, updates that specific filial via
// `PUT /church/:id`.
export function useUpdateChurch(id?: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateChurchRequest) =>
      id ? churchApi.updateById(id, data) : churchApi.update(data),
    onSuccess: (church) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY })
      trackEvent("church_updated", { church_id: church.id })
    },
  })
}
