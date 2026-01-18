import { api } from "../client"
import type {
  Contribution,
  CreateContributionRequest,
  UpdateContributionRequest,
} from "../types"

export const contributionsApi = {
  getAll: () => api.get<Contribution[]>("/contributions"),

  getById: (id: number) => api.get<Contribution>(`/contributions/${id}`),

  create: (data: CreateContributionRequest) =>
    api.post<Contribution>("/contributions", data),

  update: (id: number, data: UpdateContributionRequest) =>
    api.put<Contribution>(`/contributions/${id}`, data),

  delete: (id: number) => api.delete<void>(`/contributions/${id}`),
}
