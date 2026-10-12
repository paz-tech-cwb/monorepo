import { api } from "../client"

export interface Course {
  id: number
  title: string
  description?: string
  thumbnailUrl?: string
}

export interface AcademyResponse {
  courses: Course[]
}

export const academyApi = {
  getAcademy: () => api.get<AcademyResponse>("/academy"),
}
