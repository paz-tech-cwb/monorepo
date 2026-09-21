import { api } from "../client"
import type { Questionnaire, UpsertQuestionnaireRequest } from "../types/academy"

interface QuestionnaireApiResponse {
  success: boolean
  data: Questionnaire
}

export const courseQuestionnairesApi = {
  get: async (courseId: string): Promise<Questionnaire | null> => {
    try {
      const response = await api.get<QuestionnaireApiResponse | Questionnaire>(
        `/courses/${courseId}/questionnaire`,
      )
      if (response && "data" in response && response.data) {
        return response.data as Questionnaire
      }
      return response as Questionnaire
    } catch {
      return null
    }
  },

  upsert: async (courseId: string, data: UpsertQuestionnaireRequest): Promise<Questionnaire> => {
    const response = await api.put<QuestionnaireApiResponse | Questionnaire>(
      `/courses/${courseId}/questionnaire`,
      data,
    )
    if (response && "data" in response && response.data) {
      return response.data as Questionnaire
    }
    return response as Questionnaire
  },

  delete: async (courseId: string): Promise<void> => {
    await api.delete<void>(`/courses/${courseId}/questionnaire`)
  },
}
