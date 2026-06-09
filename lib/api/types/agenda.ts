export type RecurrenceType = "WEEKLY" | "MONTHLY"

export interface Address {
  street: string
  number: string
  complement?: string | null
  reference?: string | null
  neighborhood: string
  city: string
  state: string
  zip_code: string
  country: string
}

export interface AgendaEvent {
  id: number
  title: string
  description?: string
  initial_date: string
  final_date?: string
  recurrence_type?: RecurrenceType | null
  image?: string
  church_id?: number
  address?: Address
}

// API response is grouped by month
export interface AgendaMonthGroup {
  month: string
  ano: string
  events: AgendaEvent[]
}

export interface BackendAgendaEvent {
  id: number
  title: string
  // Legacy flat shape — date was renamed to initial_date; keep both for compatibility
  date?: string
  initial_date?: string
  final_date?: string | null
  description?: string | null
  recurrence_type?: RecurrenceType | null
  image?: string | null
  imageUrl?: string | null
  image_url?: string | null
  createdAt?: string
  updatedAt?: string
}

export type AgendaApiResponse = AgendaMonthGroup[] | BackendAgendaEvent[]

// Stats derived from agenda data
export interface AgendaStats {
  total_events: number
  recurring_events: number
}

export interface CreateAgendaEventRequest {
  title: string
  description?: string
  initial_date: string
  final_date?: string
  recurrence_type?: RecurrenceType | null
  image?: string
  address?: Address
}

export interface UpdateAgendaEventRequest {
  title?: string
  description?: string
  initial_date?: string
  final_date?: string
  recurrence_type?: RecurrenceType | null
  image?: string
  address?: Address
}
