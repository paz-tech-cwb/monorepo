export interface GuestProgress {
  completed_steps: number
  total_steps: number
  progress_percentage: number
}

export interface Guest {
  id: number
  name: string
  phone: string | null
  email: string | null
  picture: string | null
  created_at: string
  days_as_guest: number
  progress: GuestProgress
}
