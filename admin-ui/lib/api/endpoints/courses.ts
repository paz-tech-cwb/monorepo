import { api } from "../client"
import type {
  Course,
  CoursesApiResponse,
  CourseApiResponse,
  CourseStats,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "../types/courses"

// Helper to calculate stats from courses
export function calculateCourseStats(courses: Course[]): CourseStats {
  return {
    total_courses: courses.length,
    published_courses: courses.filter((c) => c.status === "published").length,
    total_hours: courses.reduce((sum, c) => sum + c.estimated_hours, 0),
    courses_with_url: courses.filter((c) => c.url).length,
    courses_with_image: courses.filter((c) => c.image_url).length,
  }
}

export const coursesApi = {
  getAll: async (): Promise<Course[]> => {
    const response = await api.get<CoursesApiResponse | Course[]>("/courses")
    // Handle both wrapped { data: [...] } and raw array [...] responses
    if (Array.isArray(response)) {
      return response
    }
    return response?.data ?? []
  },

  getById: async (id: string): Promise<Course> => {
    const response = await api.get<CourseApiResponse | Course>(`/courses/${id}`)
    // Handle both wrapped { data: {...} } and raw object {...} responses
    if ("data" in response && response.data) {
      return response.data as Course
    }
    return response as Course
  },

  create: async (courseData: CreateCourseRequest): Promise<Course> => {
    const response = await api.post<CourseApiResponse | Course>("/courses", courseData)
    if ("data" in response && response.data) {
      return response.data as Course
    }
    return response as Course
  },

  update: async (id: string, courseData: UpdateCourseRequest): Promise<Course> => {
    const response = await api.put<CourseApiResponse | Course>(`/courses/${id}`, courseData)
    if ("data" in response && response.data) {
      return response.data as Course
    }
    return response as Course
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<void>(`/courses/${id}`)
  },
}
