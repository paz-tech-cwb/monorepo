export interface LeadProgress {
  completed_steps: number
  total_steps: number
  progress_percentage: number
}

export interface Lead {
  id: number
  name: string
  phone: string | null
  email: string | null
  picture: string | null
  created_at: string
  days_as_lead: number
  progress: LeadProgress
}
