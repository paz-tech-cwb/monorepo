"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { announcementsApi } from "@/lib/api/endpoints/announcements"
import type {
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["announcements"]

export function useAnnouncements() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => announcementsApi.getAll(),
  })
}

export function useAnnouncement(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => announcementsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAnnouncementRequest) =>
      announcementsApi.create(data),
    onSuccess: (newAnnouncement) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("announcement_created", {
        announcement_id: newAnnouncement.id,
      })
    },
  })
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UpdateAnnouncementRequest
    }) => announcementsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("announcement_updated", { announcement_id: variables.id })
    },
  })
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => announcementsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("announcement_deleted", { announcement_id: id })
    },
  })
}
