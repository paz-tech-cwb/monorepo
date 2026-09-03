import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formulariosApi } from "@/lib/api/endpoints/formularios"
import type { CreateCourseRequest, UpdateCourseRequest } from "@/lib/api/types/formularios"
import { toast } from "sonner"

const KEY = ["form-courses", "member-registrations"]
const ALL_KEY = ["form-courses"]

export function useAllFormCourses() {
  return useQuery({ queryKey: ALL_KEY, queryFn: () => formulariosApi.listAllCourses() })
}

export function useFormCourses() {
  return useQuery({ queryKey: KEY, queryFn: () => formulariosApi.listCourses() })
}

export function useLinkCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => formulariosApi.linkCourse(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success("Curso vinculado")
    },
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCourseRequest) => formulariosApi.createCourse(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success("Curso adicionado")
    },
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCourseRequest }) =>
      formulariosApi.updateCourse(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success("Curso atualizado")
    },
  })
}

export function useUnlinkCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => formulariosApi.unlinkCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success("Curso removido")
    },
  })
}
