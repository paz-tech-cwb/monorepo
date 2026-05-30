import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formulariosApi } from "@/lib/api/endpoints/formularios"
import type { FormSlug, FormSubmissionFilters } from "@/lib/api/types/formularios"

export function useFormSubmissions<T>(slug: FormSlug, filters?: FormSubmissionFilters) {
  return useQuery({
    queryKey: ["form-submissions", slug, filters],
    queryFn: () => formulariosApi.list<T>(slug, filters),
  })
}

export function useFormSubmission<T>(slug: FormSlug, id: string) {
  return useQuery({
    queryKey: ["form-submission", slug, id],
    queryFn: () => formulariosApi.get<T>(slug, id),
    enabled: !!id,
  })
}

export function useCreateFormSubmission<T, P>(slug: FormSlug) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: P) => formulariosApi.create<T, P>(slug, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["form-submissions", slug] }),
  })
}

export function useUpdateFormSubmission<T, P>(slug: FormSlug) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: P }) =>
      formulariosApi.update<T, P>(slug, id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["form-submissions", slug] })
      qc.invalidateQueries({ queryKey: ["form-submission", slug, id] })
    },
  })
}

export function useDeleteFormSubmission(slug: FormSlug) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => formulariosApi.remove(slug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["form-submissions", slug] }),
  })
}

export function useFormAudit(slug: FormSlug, id: string) {
  return useQuery({
    queryKey: ["form-audit", slug, id],
    queryFn: () => formulariosApi.audit(slug, id),
    enabled: !!id,
  })
}
