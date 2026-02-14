import { api } from "../client"
import type { Notification, SendNotificationRequest } from "../types"

export const notificationsApi = {
  getAll: () => api.get<Notification[]>("/notifications"),

  getById: (id: number) => api.get<Notification>(`/notifications/${id}`),

  send: (data: SendNotificationRequest) =>
    api.post<Notification>("/notifications", data),

  delete: (id: number) => api.delete<void>(`/notifications/${id}`),
}
