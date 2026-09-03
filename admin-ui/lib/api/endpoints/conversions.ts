import { api } from "../client"
import type { Conversion, CreateConversionRequest } from "../types"

export const conversionsApi = {
  getAll: () => api.get<Conversion[]>("/conversions"),

  getById: (id: number) => api.get<Conversion>(`/conversions/${id}`),

  create: (data: CreateConversionRequest) =>
    api.post<Conversion>("/conversions", data),

  delete: (id: number) => api.delete<void>(`/conversions/${id}`),
}
