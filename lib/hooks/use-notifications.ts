'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api/endpoints/notifications'
import type {
  CreateNotificationRequest,
  NotificationReachRequest,
} from '@/lib/api/types'
import { trackEvent } from '@/lib/firebase/analytics'

const QUERY_KEY = ['notifications']

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

export function useCreateNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNotificationRequest) => notificationsApi.create(data),
    onSuccess: (notification) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent('notification_created', { notification_id: notification.id })
    },
    onError: () => {
      console.error('Failed to create notification')
    },
  })
}

export function useNotificationReach() {
  return useMutation({
    mutationFn: (data: NotificationReachRequest) => notificationsApi.getReach(data),
    onError: () => {
      console.error('Failed to fetch notification reach')
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent('notification_deleted', { notification_id: id })
    },
    onError: () => {
      console.error('Failed to delete notification')
    },
  })
}
