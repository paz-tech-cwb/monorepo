export interface Announcement {
  id: number
  image_url: string
  title: string
  subtitle: string
  markdown_content: string
  action_url?: string
}

export interface CreateAnnouncementRequest {
  image_url: string
  title: string
  subtitle: string
  markdown_content: string
  action_url?: string
}

export interface UpdateAnnouncementRequest {
  image_url?: string
  title?: string
  subtitle?: string
  markdown_content?: string
  action_url?: string
}
