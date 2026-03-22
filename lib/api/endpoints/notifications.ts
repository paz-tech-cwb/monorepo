// admin-ui/lib/api/endpoints/notifications.ts
import { api } from '../client'
import type {
  Notification,
  CreateNotificationRequest,
  NotificationReachRequest,
  NotificationReachResponse,
} from '../types'

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/notifications'),

  getById: (id: number) => api.get<Notification>(`/notifications/${id}`),

  create: (data: CreateNotificationRequest) =>
    api.post<Notification>('/notifications', data),

  getReach: (data: NotificationReachRequest) =>
    api.post<NotificationReachResponse>('/notifications/reach', data),

  delete: (id: number) => api.delete<void>(`/notifications/${id}`),
}
