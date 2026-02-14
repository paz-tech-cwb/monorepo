export interface Notification {
  id: number
  title: string
  message: string
  channels: string[]
  target_audience: string
  recipients: number
  status: "sent" | "pending" | "failed"
  sent_at: string
}

export interface SendNotificationRequest {
  title: string
  message: string
  channels: string[]
  target_audience: string
}
