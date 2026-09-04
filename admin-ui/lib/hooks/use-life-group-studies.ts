"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { lifeGroupStudiesApi } from "@/lib/api/endpoints/life-group-studies"
import type {
  CreateLifeGroupStudyRequest,
  UpdateLifeGroupStudyRequest,
  CreateLifeGroupStudyPublisherRequest,
} from "@/lib/api/types/life-group-studies"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["life-group-studies"]
const PUBLISHERS_QUERY_KEY = ["life-group-studies", "publishers"]

export function useLifeGroupStudies(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => lifeGroupStudiesApi.getAll(params),
  })
}

export function useLifeGroupStudy(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => lifeGroupStudiesApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateLifeGroupStudy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLifeGroupStudyRequest) => lifeGroupStudiesApi.create(data),
    onSuccess: (newStudy) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_study_created", { study_id: newStudy.id })
    },
  })
}

export function useUpdateLifeGroupStudy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLifeGroupStudyRequest }) =>
      lifeGroupStudiesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_study_updated", { study_id: variables.id })
    },
  })
}

export function useDeleteLifeGroupStudy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => lifeGroupStudiesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_study_deleted", { study_id: id })
    },
  })
}

export function useLifeGroupStudyPublishers() {
  return useQuery({
    queryKey: PUBLISHERS_QUERY_KEY,
    queryFn: () => lifeGroupStudiesApi.getPublishers(),
  })
}

export function useAddLifeGroupStudyPublisher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLifeGroupStudyPublisherRequest) =>
      lifeGroupStudiesApi.addPublisher(data),
    onSuccess: (publisher) => {
      queryClient.invalidateQueries({ queryKey: PUBLISHERS_QUERY_KEY })
      trackEvent("life_group_study_publisher_added", { user_id: String(publisher.user_id) })
    },
  })
}

export function useRemoveLifeGroupStudyPublisher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: number) => lifeGroupStudiesApi.removePublisher(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: PUBLISHERS_QUERY_KEY })
      trackEvent("life_group_study_publisher_removed", { user_id: String(userId) })
    },
  })
}
