import { api } from "../client"
import type {
  AgendaEvent,
  AgendaApiResponse,
  AgendaStats,
  BackendAgendaEvent,
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
} from "../types"

function isGroupedAgendaResponse(
  response: AgendaApiResponse
): response is Extract<AgendaApiResponse, { events: AgendaEvent[] }[]> {
  return response.some((item) => "events" in item)
}

function normalizeBackendEvent(event: BackendAgendaEvent): AgendaEvent {
  return {
    id: event.id,
    title: event.title,
    initial_date: event.initial_date ?? event.date ?? "",
    final_date: event.final_date,
    description: event.description,
    recurrence_type: event.recurrence_type,
    image: event.image ?? event.imageUrl ?? event.image_url ?? undefined,
  }
}

// Accept both the current flat backend response and the older grouped shape.
export function normalizeAgendaResponse(response: AgendaApiResponse): AgendaEvent[] {
  if (isGroupedAgendaResponse(response)) {
    return response.flatMap((monthGroup) => monthGroup.events)
  }

  return response.map(normalizeBackendEvent)
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
    return normalizeAgendaResponse(data)
  },

  // Get raw grouped response (useful for month-based views)
  getAllGrouped: () => api.get<AgendaApiResponse>("/events"),

  getById: (id: number) => api.get<AgendaEvent>(`/events/${id}`),

  create: ({ address: _address, ...data }: CreateAgendaEventRequest) =>
    api.post<AgendaEvent>("/events", data),

  update: (id: number, { address: _address, ...data }: UpdateAgendaEventRequest) =>
    api.patch<AgendaEvent>(`/events/${id}`, data),

  delete: (id: number) => api.delete<void>(`/events/${id}`),
}
