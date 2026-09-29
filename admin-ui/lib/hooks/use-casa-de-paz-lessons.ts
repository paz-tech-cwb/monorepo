"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { casaDePazLessonsApi } from "@/lib/api/endpoints/casa-de-paz-lessons"
import type { UpdateCasaDePazLessonRequest } from "@/lib/api/types"

const QUERY_KEY = ["casa-de-paz-lessons"]

export function useCasaDePazLessons() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => casaDePazLessonsApi.getAll(),
  })
}

export function useUpdateCasaDePazLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ week, data }: { week: number; data: UpdateCasaDePazLessonRequest }) =>
      casaDePazLessonsApi.update(week, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
