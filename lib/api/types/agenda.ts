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

export type AgendaApiResponse = AgendaMonthGroup[]

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
