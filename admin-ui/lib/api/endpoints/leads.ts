import { api } from "../client"
import type { Lead } from "../types"

export const leadsApi = {
  getAll: () => api.get<Lead[]>("/users/leads"),
}
