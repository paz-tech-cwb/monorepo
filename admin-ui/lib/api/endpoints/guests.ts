import { api } from "../client"
import type { Guest } from "../types"

export const guestsApi = {
  getAll: () => api.get<Guest[]>("/users/guests"),
}
