import { api } from "../client"
import type {
  AgendaEvent,
  AgendaApiResponse,
  AgendaStats,
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
} from "../types"

// Mock API base URL for agenda endpoint
const AGENDA_MOCK_BASE_URL = "https://d21c4655-831b-482d-8992-73131fa5cd0f.mock.pstmn.io/api"

// Helper to flatten the grouped API response into a flat array
function flattenAgendaResponse(response: AgendaApiResponse): AgendaEvent[] {
  return response.flatMap((monthGroup) => monthGroup.events)
}

// Helper to calculate stats from the agenda response
export function calculateAgendaStats(events: AgendaEvent[]): AgendaStats {
  return {
    totalEvents: events.length,
    recurringEvents: events.filter((e) => e.recurrence_type !== null && e.recurrence_type !== undefined).length,
  }
}

export const agendaApi = {
  // Fetch from mock API and flatten the grouped response
  getAll: async (): Promise<AgendaEvent[]> => {
    const response = await fetch(`${AGENDA_MOCK_BASE_URL}/events`)
    if (!response.ok) {
      throw new Error(`Failed to fetch agenda: ${response.status} ${response.statusText}`)
    }
    const data: AgendaApiResponse = await response.json()
    return flattenAgendaResponse(data)
  },

  // Get raw grouped response (useful for month-based views)
  getAllGrouped: async (): Promise<AgendaApiResponse> => {
    const response = await fetch(`${AGENDA_MOCK_BASE_URL}/events`)
    if (!response.ok) {
      throw new Error(`Failed to fetch agenda: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  getById: (id: number) => api.get<AgendaEvent>(`/events/${id}`),

  create: (data: CreateAgendaEventRequest) =>
    api.post<AgendaEvent>("/events", data),

  update: (id: number, data: UpdateAgendaEventRequest) =>
    api.put<AgendaEvent>(`/events/${id}`, data),

  delete: (id: number) => api.delete<void>(`/events/${id}`),
}
