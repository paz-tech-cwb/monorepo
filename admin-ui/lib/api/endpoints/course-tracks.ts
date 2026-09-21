import { api } from "../client"
import type {
  CourseTrack,
  CreateCourseTrackRequest,
  SetTrackCoursesRequest,
  UpdateCourseTrackRequest,
} from "../types/academy"

interface CourseTracksApiResponse {
  success: boolean
  data: CourseTrack[]
}

interface CourseTrackApiResponse {
  success: boolean
  data: CourseTrack
}

export const courseTracksApi = {
  getAll: async (): Promise<CourseTrack[]> => {
    const response = await api.get<CourseTracksApiResponse | CourseTrack[]>("/course-tracks")
    if (Array.isArray(response)) {
      return response
    }
    return response?.data ?? []
  },

  create: async (data: CreateCourseTrackRequest): Promise<CourseTrack> => {
    const response = await api.post<CourseTrackApiResponse | CourseTrack>("/course-tracks", data)
    if (response && "data" in response && response.data) {
      return response.data as CourseTrack
    }
    return response as CourseTrack
  },

  update: async (id: number, data: UpdateCourseTrackRequest): Promise<CourseTrack> => {
    const response = await api.put<CourseTrackApiResponse | CourseTrack>(`/course-tracks/${id}`, data)
    if (response && "data" in response && response.data) {
      return response.data as CourseTrack
    }
    return response as CourseTrack
  },

  delete: async (id: number): Promise<void> => {
    await api.delete<void>(`/course-tracks/${id}`)
  },

  setCourses: async (id: number, data: SetTrackCoursesRequest): Promise<CourseTrack> => {
    const response = await api.put<CourseTrackApiResponse | CourseTrack>(
      `/course-tracks/${id}/courses`,
      data,
    )
    if (response && "data" in response && response.data) {
      return response.data as CourseTrack
    }
    return response as CourseTrack
  },
}
