import { api } from "../client"
import type {
  Area,
  AreaHierarchy,
  CreateAreaRequest,
  OrgChart,
  UpdateAreaRequest,
} from "../types"

export const areasApi = {
  getAll: () => api.get<Area[]>("/areas"),

  getById: (id: number) => api.get<Area>(`/areas/${id}`),

  getHierarchy: () => api.get<AreaHierarchy[]>("/areas/hierarchy"),

  getOrgChart: () => api.get<OrgChart>("/areas/org-chart"),

  create: (data: CreateAreaRequest) => api.post<Area>("/areas", data),

  update: (id: number, data: UpdateAreaRequest) =>
    api.put<Area>(`/areas/${id}`, data),

  delete: (id: number) => api.delete<void>(`/areas/${id}`),
}
