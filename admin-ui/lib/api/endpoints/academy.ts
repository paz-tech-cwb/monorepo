import { api } from "../client"

export interface Course {
  id: number
  title: string
  description?: string
  thumbnailUrl?: string
}

export interface CourseTrack {
  id: number
  title: string
  description?: string
  courses: Course[]
}

export interface AcademyResponse {
  tracks: CourseTrack[]
}

export const academyApi = {
  getAcademy: () => api.get<AcademyResponse>("/academy"),
}
