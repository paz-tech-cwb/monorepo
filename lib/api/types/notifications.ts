// admin-ui/lib/api/types/notifications.ts

export type NotificationChannel = 'push' | 'email' | 'sms' | 'whatsapp'

export type NotificationCategory =
  | 'events'
  | 'announcements'
  | 'life_group'
  | 'academy'
  | 'admin_alerts'
  | 'forms'
  | 'member_journey'
  | 'contributions'

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
  channels: NotificationChannel[]
  segment: NotificationSegment
  recipients_count: number
  recipients_by_channel?: Record<string, number> | null
  status: NotificationStatus
  origin: 'manual' | 'automatic'
  scheduled_at: string | null
  sent_at: string | null
  created_by: number | null
  created_at: string
}

export interface CreateNotificationRequest {
  title: string
  message: string
  category: NotificationCategory
  channels: NotificationChannel[]
  segment: NotificationSegment
  scheduled_at?: string | null
}

export interface NotificationReachRequest {
  channels: NotificationChannel[]
  segment: NotificationSegment
  category: NotificationCategory
}

export interface NotificationReachResponse {
  total: number
  by_channel: Record<string, number>
  excluded: Record<string, number>
}
