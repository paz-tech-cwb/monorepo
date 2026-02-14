"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notificationsApi } from "@/lib/api/endpoints/notifications"
import type { SendNotificationRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["notifications"]

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationsApi.getAll(),
  })
}

export function useNotification(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => notificationsApi.getById(id),
    enabled: !!id,
  })
}

export function useSendNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SendNotificationRequest) =>
      notificationsApi.send(data),
    onSuccess: (newNotification) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("notification_sent", {
        notification_id: newNotification.id,
      })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("notification_deleted", { notification_id: id })
    },
  })
}
