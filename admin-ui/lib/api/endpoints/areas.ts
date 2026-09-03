import { api } from "../client"
import type { Area, CreateAreaRequest, UpdateAreaRequest } from "../types"

export const areasApi = {
  getAll: () => api.get<Area[]>("/areas"),

  getById: (id: number) => api.get<Area>(`/areas/${id}`),

  create: (data: CreateAreaRequest) => api.post<Area>("/areas", data),

  update: (id: number, data: UpdateAreaRequest) =>
    api.put<Area>(`/areas/${id}`, data),

  delete: (id: number) => api.delete<void>(`/areas/${id}`),
}
