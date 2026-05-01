import { api } from "../client"
import type {
  AgendaEvent,
  AgendaApiResponse,
  AgendaStats,
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
} from "../types"

// Helper to flatten the grouped API response into a flat array
function flattenAgendaResponse(response: AgendaApiResponse): AgendaEvent[] {
  return response.flatMap((monthGroup) => monthGroup.events)
}

// Helper to calculate stats from the agenda response
export function calculateAgendaStats(events: AgendaEvent[]): AgendaStats {
  return {
    total_events: events.length,
    recurring_events: events.filter((e) => e != null && e.recurrence_type != null).length,
  }
}

export const agendaApi = {
  // Fetch all events and flatten the grouped response
  getAll: async (): Promise<AgendaEvent[]> => {
    const data = await api.get<AgendaApiResponse>("/events")
    return flattenAgendaResponse(data)
  },

  // Get raw grouped response (useful for month-based views)
  getAllGrouped: () => api.get<AgendaApiResponse>("/events"),

  getById: (id: number) => api.get<AgendaEvent>(`/events/${id}`),

  create: (data: CreateAgendaEventRequest) =>
    api.post<AgendaEvent>("/events", data),

  update: (id: number, data: UpdateAgendaEventRequest) =>
    api.put<AgendaEvent>(`/events/${id}`, data),

  delete: (id: number) => api.delete<void>(`/events/${id}`),
}
