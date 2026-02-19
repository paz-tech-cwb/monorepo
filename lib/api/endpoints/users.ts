import { api } from "../client"
import type { AdminUser, CreateUserRequest, UpdateUserRequest, UpdateUserRoleRequest } from "../types"

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
}
