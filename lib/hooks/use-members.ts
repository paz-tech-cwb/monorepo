"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { membersApi } from "@/lib/api/endpoints/members"
import type { CreateMemberRequest, UpdateMemberRequest } from "@/lib/api/types/members"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["members"]

export function useMembers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => membersApi.getAll(),
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMemberRequest) => membersApi.create(data),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("member_created", { member_id: member.id })
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMemberRequest }) =>
      membersApi.update(id, data),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("member_updated", { member_id: member.id })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => membersApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("member_deleted", { member_id: id })
    },
  })
}
