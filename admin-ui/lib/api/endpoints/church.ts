import { api } from "@/lib/api/client"
import type { Church, CreateChurchRequest, UpdateChurchRequest } from "@/lib/api/types"

export const churchApi = {
  // Legacy bare routes — resolve to the requesting user's primary filial.
  get: () => api.get<Church>("/church"),
  update: (data: UpdateChurchRequest) => api.put<Church>("/church", data),

  list: () => api.get<Church[]>("/church/list"),
  getById: (id: number) => api.get<Church>(`/church/${id}`),
  create: (data: CreateChurchRequest) => api.post<Church>("/church", data),
  updateById: (id: number, data: UpdateChurchRequest) =>
    api.put<Church>(`/church/${id}`, data),
}
