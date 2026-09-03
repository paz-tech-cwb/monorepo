import { api } from "../client"
import type { Announcement } from "../types"

export interface HomeResponse {
  announcements: Announcement[]
}

export const homeApi = {
  getHome: () => api.get<HomeResponse>("/home"),
}
