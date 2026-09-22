import { api } from "../client"
import type { CasaDePazLesson, UpdateCasaDePazLessonRequest } from "../types"

export const casaDePazLessonsApi = {
  getAll: () => api.get<CasaDePazLesson[]>("/casa-de-paz-lessons"),

  update: (week: number, data: UpdateCasaDePazLessonRequest) =>
    api.patch<CasaDePazLesson>(`/casa-de-paz-lessons/${week}`, data),
}
