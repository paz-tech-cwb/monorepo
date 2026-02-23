import { api } from "../client"
import type {
  AdminUser,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  MemberUser,
  CreateMemberUserRequest,
  UpdateMemberUserRequest
} from "../types"

export const usersApi = {
  getAll: async () => {
    const response = await api.get<AdminUser[] | { data: AdminUser[] }>("/users")
    return Array.isArray(response) ? response : response.data ?? []
  },

  getById: (id: number) => api.get<AdminUser>(`/users/${id}`),

  create: (data: CreateUserRequest) =>
    api.post<AdminUser>("/users", data),

  update: (id: number, data: UpdateUserRequest) =>
    api.put<AdminUser>(`/users/${id}`, data),

  updateRole: (id: number, data: UpdateUserRoleRequest) =>
    api.patch<AdminUser>(`/users/${id}/role`, data),

  delete: (id: number) => api.delete<void>(`/users/${id}`),

  // Member-specific operations (using /api/users endpoint)
  createMember: (data: CreateMemberUserRequest) =>
    api.post<MemberUser>("/users", data),

  updateMember: (id: number, data: UpdateMemberUserRequest) =>
    api.put<MemberUser>(`/users/${id}`, data),
}
