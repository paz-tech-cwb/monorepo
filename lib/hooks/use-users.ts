"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usersApi } from "@/lib/api/endpoints/users"
import { lifeGroupsApi } from "@/lib/api/endpoints/life-groups"
import type {
  AdminUser,
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
// - email, address (structured) and completed_courses pass through as-is
// - leader_name (UI-only) is not sent
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
    address: data.address,
    completed_courses: data.completed_courses,
  }
}

function toUpdateUserRequest(data: UpdateMemberUserRequest): UpdateUserRequest {
  return {
    name: data.full_name,
    email: data.email,
    phone: data.cellphone,
    birth_date: data.birthday_date,
    sector_id: data.sector_id,
    address: data.address,
    completed_courses: data.completed_courses,
  }
}

// Result of a member create/update: the user record itself always reflects
// the mutation's success/failure. Life-group assignment is a best-effort
// follow-up step — if it fails, the user record still exists (and, unlike
// user creation, resubmitting the form can't retry it because the email is
// now taken), so a partial failure here must not fail the whole mutation.
// Callers should check `lifeGroupError` and surface it separately.
export interface MemberMutationResult {
  user: AdminUser
  lifeGroupError: Error | null
}

async function assignLifeGroups(
  userId: number,
  lifeGroupIds: number[]
): Promise<Error | null> {
  for (const lifeGroupId of lifeGroupIds) {
    try {
      await lifeGroupsApi.addMember(lifeGroupId, userId)
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error))
    }
  }
  return null
}

export function useCreateMemberUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMemberUserRequest): Promise<MemberMutationResult> => {
      const newUser = await usersApi.create(toCreateUserRequest(data))
      const lifeGroupError = await assignLifeGroups(newUser.id, data.life_group_ids)
      return { user: newUser, lifeGroupError }
    },
    onSuccess: ({ user }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_created", { user_id: user.id })
    },
  })
}

export function useUpdateMemberUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: UpdateMemberUserRequest
    }): Promise<MemberMutationResult> => {
      const updatedUser = await usersApi.update(id, toUpdateUserRequest(data))
      const lifeGroupError = await assignLifeGroups(id, data.life_group_ids ?? [])
      return { user: updatedUser, lifeGroupError }
    },
    onSuccess: ({ user }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("user_updated", { user_id: user.id })
    },
  })
}
