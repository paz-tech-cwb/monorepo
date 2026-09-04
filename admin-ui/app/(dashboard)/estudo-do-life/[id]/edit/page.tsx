"use client"

import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useLifeGroupStudy } from "@/lib/hooks/use-life-group-studies"
import { ApiError } from "@/lib/api/client"
import { LifeGroupStudyForm } from "../../life-group-study-form"

export default function EditLifeGroupStudyPage() {
  const params = useParams<{ id: string }>()
  const { data: study, isLoading, error } = useLifeGroupStudy(params.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !study) {
    const message =
      error instanceof ApiError && error.status === 403
        ? "Você não tem permissão para editar este estudo."
        : "Estudo não encontrado."
    return (
      <div className="p-6">
        <p className="text-destructive">{message}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Editar Estudo do Life</h1>
      <LifeGroupStudyForm study={study} />
    </div>
  )
}
