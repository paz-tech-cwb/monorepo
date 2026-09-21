export type QuestionType = "single_choice" | "multiple_choice" | "free_text"

export interface Lesson {
  id: string
  course_id: string
  title: string
  description?: string | null
  youtube_video_id: string
  duration_seconds?: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateLessonRequest {
  title: string
  description?: string | null
  youtube_video_id: string
  duration_seconds?: number | null
  sort_order?: number
}

export interface UpdateLessonRequest {
  title?: string
  description?: string | null
  youtube_video_id?: string
  duration_seconds?: number | null
  sort_order?: number
}

export interface QuestionOption {
  id?: string
  text: string
  is_correct: boolean
  sort_order?: number
}

export interface Question {
  id?: string
  text: string
  type: QuestionType
  sort_order?: number
  points?: number
  options?: QuestionOption[]
}

export interface Questionnaire {
  id: string
  course_id: string
  title: string
  description?: string | null
  passing_score_percentage: number
  max_attempts?: number | null
  questions: Question[]
}

export interface UpsertQuestionnaireRequest {
  title: string
  description?: string | null
  passing_score_percentage?: number
  max_attempts?: number | null
  questions: Question[]
}

export interface Certificate {
  id: string
  course_id: string
  user_id: number
  issued_at: string
  certificate_url?: string | null
}

export interface CourseTrackCourse {
  id: string
  title: string
  description?: string | null
  thumbnail_url?: string | null
  url?: string | null
  sort_order: number
}

export interface CourseTrack {
  id: number
  title: string
  description?: string | null
  sort_order: number
  courses: CourseTrackCourse[]
}

export interface CreateCourseTrackRequest {
  title: string
  description?: string | null
  sort_order?: number
}

export interface UpdateCourseTrackRequest {
  title?: string
  description?: string | null
  sort_order?: number
}

export interface SetTrackCoursesRequest {
  course_ids: string[]
}
