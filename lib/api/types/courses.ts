export type CourseCategory = "teologia" | "lideranca" | "ministerio" | "discipulado"
export type CourseStatus = "draft" | "published" | "archived"

export interface Course {
  id: string
  title: string
  description: string
  creator: string
  creator_id?: string
  estimated_hours: number
  category: CourseCategory
  url?: string | null
  image_url?: string | null
  thumbnail_url?: string | null
  status: CourseStatus
  created_at: string
  updated_at: string
}

export interface CoursesApiResponse {
  success: boolean
  data: Course[]
}

export interface CourseApiResponse {
  success: boolean
  data: Course
}

export interface CourseStats {
  total_courses: number
  published_courses: number
  total_hours: number
  courses_with_url: number
  courses_with_image: number
}

export interface CreateCourseRequest {
  title: string
  description: string
  creator: string
  creator_id?: string
  estimated_hours: number
  category: CourseCategory
  url?: string | null
  image_url?: string | null
  thumbnail_url?: string | null
  status?: CourseStatus
}

export interface UpdateCourseRequest {
  title?: string
  description?: string
  creator?: string
  creator_id?: string
  estimated_hours?: number
  category?: CourseCategory
  url?: string | null
  image_url?: string | null
  thumbnail_url?: string | null
  status?: CourseStatus
}
