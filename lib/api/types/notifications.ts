// admin-ui/lib/api/types/notifications.ts

export type NotificationCategory =
  | 'events'
  | 'announcements'
  | 'life_group'
  | 'academy'
  | 'admin_alerts'

export type NotificationStatus =
  | 'pending'
  | 'processing'
  | 'scheduled'
  | 'sent'
  | 'failed'

export interface NotificationSegment {
  type: 'all' | 'filtered'
  filters?: {
    roles?: string[]
    sector_ids?: number[]
    life_group_ids?: number[]
    status?: 'active' | 'inactive'
  }
}

export interface Notification {
  id: number
  title: string
  message: string
  category: NotificationCategory
  channels: string[]
  segment: NotificationSegment
  recipients_count: number
  status: NotificationStatus
  scheduled_at: string | null
  sent_at: string | null
  created_by: number | null
  created_at: string
}

export interface CreateNotificationRequest {
  title: string
  message: string
  category: NotificationCategory
  channels: string[]
  segment: NotificationSegment
  scheduled_at?: string | null
}

export interface NotificationReachRequest {
  channels: string[]
  segment: NotificationSegment
  category: NotificationCategory
}

export interface NotificationReachResponse {
  total: number
  by_channel: Record<string, number>
  excluded: Record<string, number>
}
