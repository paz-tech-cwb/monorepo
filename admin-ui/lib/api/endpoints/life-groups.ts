import { api } from "../client"
import type { LifeGroup, CreateLifeGroupRequest, UpdateLifeGroupRequest } from "../types"

export const lifeGroupsApi = {
  getAll: () => api.get<LifeGroup[]>("/life-groups"),

  create: (data: CreateLifeGroupRequest) =>
    api.post<LifeGroup>("/life-groups", data),

  update: (id: number, data: UpdateLifeGroupRequest) =>
    api.put<LifeGroup>(`/life-groups/${id}`, data),

  remove: (id: number) =>
    api.delete<void>(`/life-groups/${id}`),

  addMember: (id: number, userId: number) =>
    api.post<void>(`/life-groups/${id}/members/${userId}`),

  removeMember: (id: number, userId: number) =>
    api.delete<void>(`/life-groups/${id}/members/${userId}`),
}
