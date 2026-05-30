import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formulariosApi } from "@/lib/api/endpoints/formularios"
import type { CreateCourseRequest, UpdateCourseRequest } from "@/lib/api/types/formularios"
import { toast } from "sonner"

const KEY = ["form-courses", "member-registrations"]

export function useFormCourses() {
  return useQuery({ queryKey: KEY, queryFn: () => formulariosApi.listCourses() })
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
