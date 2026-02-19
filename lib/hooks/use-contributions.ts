"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { contributionsApi } from "@/lib/api/endpoints/contributions"
import type {
  CreateContributionRequest,
  UpdateContributionRequest,
} from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["contributions"]

export function useContributions() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => contributionsApi.getAll(),
  })
}

export function useContribution(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => contributionsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateContribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateContributionRequest) =>
      contributionsApi.create(data),
    onSuccess: (newContribution) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("contribution_created", {
        contribution_id: newContribution?.id,
      })
    },
  })
}

export function useUpdateContribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UpdateContributionRequest
    }) => contributionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("contribution_updated", { contribution_id: variables.id })
    },
  })
}

export function useDeleteContribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => contributionsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("contribution_deleted", { contribution_id: id })
    },
  })
}
