"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usersApi } from "@/lib/api/endpoints/users"
import type { CreateUserRequest, UpdateUserRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["users"]

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => usersApi.getAll(),
  })
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => usersApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_created", { user_id: newUser.id })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: (updatedUser, { data }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_updated", { user_id: updatedUser.id })
      if (data.role) {
        trackEvent("user_role_changed", {
          user_id: updatedUser.id,
          new_role: data.role,
        })
      }
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_deleted", { user_id: id })
    },
  })
}
