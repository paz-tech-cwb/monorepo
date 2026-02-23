"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usersApi } from "@/lib/api/endpoints/users"
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  CreateMemberUserRequest,
  UpdateMemberUserRequest
} from "@/lib/api/types"
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

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRoleRequest }) =>
      usersApi.updateRole(id, data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_role_changed", {
        user_id: updatedUser.id,
        new_role: updatedUser.role,
      })
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

// Member-specific hooks (using /api/users endpoint)
export function useCreateMemberUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMemberUserRequest) => usersApi.createMember(data),
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_created", { user_id: newMember.id })
    },
  })
}

export function useUpdateMemberUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMemberUserRequest }) =>
      usersApi.updateMember(id, data),
    onSuccess: (updatedMember) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_updated", { user_id: updatedMember.id })
    },
  })
}
