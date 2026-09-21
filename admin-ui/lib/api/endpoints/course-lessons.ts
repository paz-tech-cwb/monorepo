import { api } from "../client"
import type { CreateLessonRequest, Lesson, UpdateLessonRequest } from "../types/academy"

interface LessonsApiResponse {
  success: boolean
  data: Lesson[]
}

interface LessonApiResponse {
  success: boolean
  data: Lesson
}

export const courseLessonsApi = {
  getAll: async (courseId: string): Promise<Lesson[]> => {
    const response = await api.get<LessonsApiResponse | Lesson[]>(`/courses/${courseId}/lessons`)
    if (Array.isArray(response)) {
      return response
    }
    return response?.data ?? []
  },

  create: async (courseId: string, data: CreateLessonRequest): Promise<Lesson> => {
    const response = await api.post<LessonApiResponse | Lesson>(`/courses/${courseId}/lessons`, data)
    if (response && "data" in response && response.data) {
      return response.data as Lesson
    }
    return response as Lesson
  },

  update: async (courseId: string, lessonId: string, data: UpdateLessonRequest): Promise<Lesson> => {
    const response = await api.put<LessonApiResponse | Lesson>(
      `/courses/${courseId}/lessons/${lessonId}`,
      data,
    )
    if (response && "data" in response && response.data) {
      return response.data as Lesson
    }
    return response as Lesson
  },

  delete: async (courseId: string, lessonId: string): Promise<void> => {
    await api.delete<void>(`/courses/${courseId}/lessons/${lessonId}`)
  },

  reorder: async (courseId: string, lessonIds: string[]): Promise<Lesson[]> => {
    const response = await api.put<LessonsApiResponse | Lesson[]>(`/courses/${courseId}/lessons/reorder`, {
      lesson_ids: lessonIds,
    })
    if (Array.isArray(response)) {
      return response
    }
    return response?.data ?? []
  },
}
