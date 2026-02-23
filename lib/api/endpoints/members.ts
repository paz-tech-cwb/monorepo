import { api } from "../client"
import type { Member, CreateMemberRequest, UpdateMemberRequest } from "../types"

export const membersApi = {
  getAll: () => api.get<Member[]>("/members"),

  getById: (id: number) => api.get<Member>(`/members/${id}`),

  create: (data: CreateMemberRequest) => api.post<Member>("/members", data),

  update: (id: number, data: UpdateMemberRequest) =>
    api.put<Member>(`/members/${id}`, data),

  delete: (id: number) => api.delete<void>(`/members/${id}`),
}
