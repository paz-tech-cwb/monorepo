"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { courseLessonsApi } from "@/lib/api/endpoints/course-lessons"
import type { CreateLessonRequest, UpdateLessonRequest } from "@/lib/api/types/academy"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = (courseId: string) => ["course-lessons", courseId]

export function useCourseLessons(courseId: string) {
  return useQuery({
    queryKey: QUERY_KEY(courseId),
    queryFn: () => courseLessonsApi.getAll(courseId),
    enabled: !!courseId,
  })
}

export function useCreateCourseLesson(courseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLessonRequest) => courseLessonsApi.create(courseId, data),
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(courseId) })
      trackEvent("course_lesson_created", { course_id: courseId, lesson_id: lesson.id })
    },
  })
}

export function useUpdateCourseLesson(courseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: UpdateLessonRequest }) =>
      courseLessonsApi.update(courseId, lessonId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(courseId) })
      trackEvent("course_lesson_updated", { course_id: courseId, lesson_id: variables.lessonId })
    },
  })
}

export function useDeleteCourseLesson(courseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lessonId: string) => courseLessonsApi.delete(courseId, lessonId),
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(courseId) })
      trackEvent("course_lesson_deleted", { course_id: courseId, lesson_id: lessonId })
    },
  })
}

export function useReorderCourseLessons(courseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lessonIds: string[]) => courseLessonsApi.reorder(courseId, lessonIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(courseId) })
      trackEvent("course_lessons_reordered", { course_id: courseId })
    },
  })
}
