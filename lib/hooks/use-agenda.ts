"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { agendaApi } from "@/lib/api/endpoints/agenda"
import type {
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
} from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["agenda"]

export function useAgenda() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => agendaApi.getAll(),
  })
}

export function useAgendaEvent(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => agendaApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateAgendaEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAgendaEventRequest) => agendaApi.create(data),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("event_created", { event_id: newEvent.id })
    },
  })
}

export function useUpdateAgendaEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UpdateAgendaEventRequest
    }) => agendaApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("event_updated", { event_id: variables.id })
    },
  })
}

export function useDeleteAgendaEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => agendaApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("event_deleted", { event_id: id })
    },
  })
}
