import { api } from "../client"
import type {
  LifeGroupStudy,
  LifeGroupStudiesApiResponse,
  CreateLifeGroupStudyRequest,
  UpdateLifeGroupStudyRequest,
  LifeGroupStudyPublisher,
  CreateLifeGroupStudyPublisherRequest,
} from "../types/life-group-studies"

export const lifeGroupStudiesApi = {
  getAll: (params: { page?: number; limit?: number } = {}): Promise<LifeGroupStudiesApiResponse> => {
    const query = new URLSearchParams()
    if (params.page) query.set("page", String(params.page))
    if (params.limit) query.set("limit", String(params.limit))
    const qs = query.toString()
    return api.get<LifeGroupStudiesApiResponse>(
      `/life-group-studies${qs ? `?${qs}` : ""}`
    )
  },

  getById: (id: string): Promise<LifeGroupStudy> =>
    api.get<LifeGroupStudy>(`/life-group-studies/${id}`),

  create: (data: CreateLifeGroupStudyRequest): Promise<LifeGroupStudy> =>
    api.post<LifeGroupStudy>("/life-group-studies", data),

  update: (id: string, data: UpdateLifeGroupStudyRequest): Promise<LifeGroupStudy> =>
    api.patch<LifeGroupStudy>(`/life-group-studies/${id}`, data),

  delete: (id: string): Promise<void> =>
    api.delete<void>(`/life-group-studies/${id}`),

  getPublishers: (): Promise<LifeGroupStudyPublisher[]> =>
    api.get<LifeGroupStudyPublisher[]>("/life-group-studies/publishers"),

  addPublisher: (data: CreateLifeGroupStudyPublisherRequest): Promise<LifeGroupStudyPublisher> =>
    api.post<LifeGroupStudyPublisher>("/life-group-studies/publishers", data),

  removePublisher: (userId: number): Promise<void> =>
    api.delete<void>(`/life-group-studies/publishers/${userId}`),
}
