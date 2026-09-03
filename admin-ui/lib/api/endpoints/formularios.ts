import { api } from "../client"
import type {
  FormCatalogEntry,
  FormSlug,
  FormSubmissionFilters,
  FormCourse,
  CreateCourseRequest,
  UpdateCourseRequest,
  AuditLogEntry,
  FormUserLookupResult,
} from "../types/formularios"

export const formulariosApi = {
  catalog: () => api.get<FormCatalogEntry[]>("/forms"),

  list: <T>(slug: FormSlug, filters?: FormSubmissionFilters) => {
    const qs = filters
      ? "?" + new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : ""
    return api.get<T[]>(`/forms/${slug}${qs}`)
  },

  get: <T>(slug: FormSlug, id: string) => api.get<T>(`/forms/${slug}/${id}`),
  create: <T, P>(slug: FormSlug, payload: P) => api.post<T>(`/forms/${slug}`, payload),
  update: <T, P>(slug: FormSlug, id: string, payload: P) => api.patch<T>(`/forms/${slug}/${id}`, payload),
  remove: (slug: FormSlug, id: string) => api.delete<void>(`/forms/${slug}/${id}`),
  audit: (slug: FormSlug, id: string) => api.get<AuditLogEntry[]>(`/forms/${slug}/${id}/audit`),

  lookupUser: (filters: { email?: string; phone?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][]
    ).toString()
    return api.get<FormUserLookupResult | null>(`/users/lookup?${qs}`)
  },

  listAllCourses: () => api.get<FormCourse[]>(`/form-courses`),
  listCourses: () => api.get<FormCourse[]>(`/forms/member-registrations/courses`),
  linkCourse: (courseId: string) => api.post<FormCourse>(`/forms/member-registrations/courses/${courseId}/link`, {}),
  createCourse: (payload: CreateCourseRequest) => api.post<FormCourse>(`/forms/member-registrations/courses`, payload),
  updateCourse: (id: string, payload: UpdateCourseRequest) => api.patch<FormCourse>(`/form-courses/${id}`, payload),
  unlinkCourse: (id: string) => api.delete<void>(`/forms/member-registrations/courses/${id}`),
}
