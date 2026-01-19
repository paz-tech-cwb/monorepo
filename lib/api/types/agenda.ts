export type RecurrenceType = "weekly" | "monthly"

export interface Address {
  cep: string
  country: string
  state: string
  city: string
  street: string
  number: string
}

export interface AgendaEvent {
  id: number
  title: string
  description?: string
  initialDate: string
  finalDate?: string
  recurrenceType?: RecurrenceType
  image?: string
  address?: Address
}

export interface CreateAgendaEventRequest {
  title: string
  description?: string
  initialDate: string
  finalDate?: string
  recurrenceType?: RecurrenceType
  image?: string
  address?: Address
}

export interface UpdateAgendaEventRequest {
  title?: string
  description?: string
  initialDate?: string
  finalDate?: string
  recurrenceType?: RecurrenceType
  image?: string
  address?: Address
}
