"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usersApi } from "@/lib/api/endpoints/users"
import { lifeGroupsApi } from "@/lib/api/endpoints/life-groups"
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
//
// `CreateMemberUserRequest`/`UpdateMemberUserRequest` shape the member
// registration form's fields, which don't map 1:1 onto the backend's
// `CreateUserDto`/`UpdateUserDto`. This layer translates between them:
// - full_name -> name, birthday_date -> birth_date, cellphone -> phone
// - email passes through as-is
// - address (free-text string) and leader_name (UI-only) are not sent
// - life_group_ids isn't accepted by the user DTOs; group membership is
//   assigned afterwards via the life-groups membership endpoints
function toCreateUserRequest(data: CreateMemberUserRequest): CreateUserRequest {
  return {
    name: data.full_name,
    email: data.email,
    phone: data.cellphone,
    birth_date: data.birthday_date,
    role: "member",
    sector_id: data.sector_id,
  }
}

function toUpdateUserRequest(data: UpdateMemberUserRequest): UpdateUserRequest {
  return {
    name: data.full_name,
    email: data.email,
    phone: data.cellphone,
    birth_date: data.birthday_date,
    sector_id: data.sector_id,
  }
}

export function useCreateMemberUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMemberUserRequest) => {
      const newUser = await usersApi.create(toCreateUserRequest(data))

      for (const lifeGroupId of data.life_group_ids) {
        await lifeGroupsApi.addMember(lifeGroupId, newUser.id)
      }

      return newUser
    },
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_created", { user_id: newMember.id })
    },
  })
}

export function useUpdateMemberUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateMemberUserRequest }) => {
      const updatedUser = await usersApi.update(id, toUpdateUserRequest(data))

      for (const lifeGroupId of data.life_group_ids ?? []) {
        await lifeGroupsApi.addMember(lifeGroupId, id)
      }

      return updatedUser
    },
    onSuccess: (updatedMember) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_updated", { user_id: updatedMember.id })
    },
  })
}
