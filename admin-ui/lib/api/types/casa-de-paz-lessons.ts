export interface CasaDePazLesson {
  week: number
  title: string
  summary: string
  guidelines: string
  questions: string[]
  youtube_url: string | null
}

export interface UpdateCasaDePazLessonRequest {
  title?: string
  summary?: string
  guidelines?: string
  questions?: string[]
  youtube_url?: string
}
