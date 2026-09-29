import { api } from "../client"
import type { CasaDePazCycle, CreateCasaDePazCycleRequest } from "../types"

export const casaDePazCyclesApi = {
  getAll: () => api.get<CasaDePazCycle[]>("/casa-de-paz-cycles"),

  create: (data: CreateCasaDePazCycleRequest) =>
    api.post<CasaDePazCycle>("/casa-de-paz-cycles", data),

  close: (id: string) =>
    api.patch<CasaDePazCycle>(`/casa-de-paz-cycles/${id}/close`, {}),
}
