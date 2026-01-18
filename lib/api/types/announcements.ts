export interface Announcement {
  id: number
  imageUrl: string
  title: string
  subtitle: string
  markdownContent: string
  actionUrl?: string
}

export interface CreateAnnouncementRequest {
  imageUrl: string
  title: string
  subtitle: string
  markdownContent: string
  actionUrl?: string
}

export interface UpdateAnnouncementRequest {
  imageUrl?: string
  title?: string
  subtitle?: string
  markdownContent?: string
  actionUrl?: string
}
