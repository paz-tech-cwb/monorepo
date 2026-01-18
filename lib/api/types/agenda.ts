export type RecurrenceType = "weekly" | "monthly"

export interface AgendaEvent {
  id: number
  title: string
  description?: string
  initialDate: string
  finalDate?: string
  recurrenceType?: RecurrenceType
  image?: string
}

export interface CreateAgendaEventRequest {
  title: string
  description?: string
  initialDate: string
  finalDate?: string
  recurrenceType?: RecurrenceType
  image?: string
}

export interface UpdateAgendaEventRequest {
  title?: string
  description?: string
  initialDate?: string
  finalDate?: string
  recurrenceType?: RecurrenceType
  image?: string
}
