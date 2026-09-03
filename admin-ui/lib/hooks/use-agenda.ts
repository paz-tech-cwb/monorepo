"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { agendaApi, calculateAgendaStats } from "@/lib/api/endpoints/agenda"
import type {
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
  AgendaStats,
} from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["agenda"]
const GROUPED_QUERY_KEY = ["agenda", "grouped"]

export function useAgenda() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => agendaApi.getAll(),
  })
}

export function useAgendaGrouped() {
  return useQuery({
    queryKey: GROUPED_QUERY_KEY,
    queryFn: () => agendaApi.getAllGrouped(),
  })
}

export function useAgendaStats(): { data: AgendaStats | undefined; isLoading: boolean; error: Error | null } {
  const { data: events, isLoading, error } = useAgenda()

  const stats = events ? calculateAgendaStats(events) : undefined

  return { data: stats, isLoading, error }
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
      if (newEvent?.id) trackEvent("event_created", { event_id: newEvent.id })
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
