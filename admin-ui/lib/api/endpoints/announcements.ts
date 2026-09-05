import { api } from "../client"
import type {
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from "../types"

export const announcementsApi = {
  getAll: () => api.get<Announcement[]>("/announcements"),

  getById: (id: number) => api.get<Announcement>(`/announcements/${id}`),

  create: (data: CreateAnnouncementRequest) =>
    api.post<Announcement>("/announcements", data),

  update: (id: number, data: UpdateAnnouncementRequest) =>
    api.put<Announcement>(`/announcements/${id}`, data),

  delete: (id: number) => api.delete<void>(`/announcements/${id}`),
}
