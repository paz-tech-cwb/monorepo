"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { coursesApi, calculateCourseStats } from "@/lib/api/endpoints/courses"
import type {
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseStats,
} from "@/lib/api/types/courses"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["courses"]

export function useCourses() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => coursesApi.getAll(),
  })
}

export function useCourseStats(): { data: CourseStats | undefined; isLoading: boolean; error: Error | null } {
  const { data: courses, isLoading, error } = useCourses()

  const stats = courses ? calculateCourseStats(courses) : undefined

  return { data: stats, isLoading, error }
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => coursesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCourseRequest) => coursesApi.create(data),
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("course_created", { course_id: newCourse.id })
    },
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: UpdateCourseRequest
    }) => coursesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("course_updated", { course_id: variables.id })
    },
  })
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("course_deleted", { course_id: id })
    },
  })
}
