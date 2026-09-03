"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { lifeGroupsApi } from "@/lib/api/endpoints/life-groups"
import type { CreateLifeGroupRequest, UpdateLifeGroupRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["life-groups"]
const USERS_KEY = ["users"]

export function useLifeGroups() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => lifeGroupsApi.getAll(),
  })
}

export function useCreateLifeGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLifeGroupRequest) => lifeGroupsApi.create(data),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_created", { life_group_id: group.id })
    },
  })
}

export function useUpdateLifeGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLifeGroupRequest }) =>
      lifeGroupsApi.update(id, data),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_updated", { life_group_id: group.id })
    },
  })
}

export function useDeleteLifeGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => lifeGroupsApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_deleted", { life_group_id: id })
    },
  })
}

export function useAddLifeGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lifeGroupId, userId }: { lifeGroupId: number; userId: number }) =>
      lifeGroupsApi.addMember(lifeGroupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
    },
  })
}

export function useRemoveLifeGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lifeGroupId, userId }: { lifeGroupId: number; userId: number }) =>
      lifeGroupsApi.removeMember(lifeGroupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
    },
  })
}
