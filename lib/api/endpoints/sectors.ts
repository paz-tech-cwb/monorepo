import { api } from "../client"
import type { Sector, CreateSectorRequest, UpdateSectorRequest } from "../types"

export const sectorsApi = {
  getAll: () => api.get<Sector[]>("/sectors"),

  getById: (id: number) => api.get<Sector>(`/sectors/${id}`),

  create: (data: CreateSectorRequest) => api.post<Sector>("/sectors", data),

  update: (id: number, data: UpdateSectorRequest) =>
    api.put<Sector>(`/sectors/${id}`, data),

  delete: (id: number) => api.delete<void>(`/sectors/${id}`),
}
