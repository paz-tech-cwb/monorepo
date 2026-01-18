import { api } from "../client"
import type {
  AgendaEvent,
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
} from "../types"

export const agendaApi = {
  getAll: () => api.get<AgendaEvent[]>("/agenda"),

  getById: (id: number) => api.get<AgendaEvent>(`/agenda/${id}`),

  create: (data: CreateAgendaEventRequest) =>
    api.post<AgendaEvent>("/agenda", data),

  update: (id: number, data: UpdateAgendaEventRequest) =>
    api.put<AgendaEvent>(`/agenda/${id}`, data),

  delete: (id: number) => api.delete<void>(`/agenda/${id}`),
}
