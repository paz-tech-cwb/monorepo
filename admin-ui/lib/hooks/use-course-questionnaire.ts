"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { courseQuestionnairesApi } from "@/lib/api/endpoints/course-questionnaires"
import type { UpsertQuestionnaireRequest } from "@/lib/api/types/academy"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = (courseId: string) => ["course-questionnaire", courseId]

export function useCourseQuestionnaire(courseId: string) {
  return useQuery({
    queryKey: QUERY_KEY(courseId),
    queryFn: () => courseQuestionnairesApi.get(courseId),
    enabled: !!courseId,
  })
}

export function useUpsertCourseQuestionnaire(courseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpsertQuestionnaireRequest) => courseQuestionnairesApi.upsert(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(courseId) })
      trackEvent("course_questionnaire_saved", { course_id: courseId })
    },
  })
}

export function useDeleteCourseQuestionnaire(courseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => courseQuestionnairesApi.delete(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(courseId) })
      trackEvent("course_questionnaire_deleted", { course_id: courseId })
    },
  })
}
