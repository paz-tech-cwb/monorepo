"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormDrawer } from "@/components/ui/form-drawer"
import type { CreateLessonRequest, Lesson, UpdateLessonRequest } from "@/lib/api/types/academy"

interface LessonFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: Lesson | null
  isLoading: boolean
  onSubmit: (data: CreateLessonRequest | UpdateLessonRequest) => void
}

const EMPTY_FORM = {
  title: "",
  description: "",
  youtube_video_id: "",
  duration_seconds: "" as number | "",
}

export function LessonFormDialog({ open, onOpenChange, lesson, isLoading, onSubmit }: LessonFormDialogProps) {
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title,
        description: lesson.description ?? "",
        youtube_video_id: lesson.youtube_video_id,
        duration_seconds: lesson.duration_seconds ?? "",
      })
    } else {
      setFormData(EMPTY_FORM)
    }
  }, [lesson, open])

  const handleSubmit = () => {
    onSubmit({
      title: formData.title,
      description: formData.description || null,
      youtube_video_id: formData.youtube_video_id,
      duration_seconds: formData.duration_seconds === "" ? null : Number(formData.duration_seconds),
    })
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={lesson ? "Editar Lição" : "Nova Lição"}
      description="Preencha os dados da lição em vídeo"
      isLoading={isLoading}
      onSubmit={handleSubmit}
      submitLabel={lesson ? "Salvar" : "Criar Lição"}
    >
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lesson-title">Título</Label>
          <Input
            id="lesson-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Título da lição"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lesson-description">Descrição</Label>
          <Textarea
            id="lesson-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição da lição"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lesson-youtube">Vídeo do YouTube</Label>
          <Input
            id="lesson-youtube"
            value={formData.youtube_video_id}
            onChange={(e) => setFormData({ ...formData, youtube_video_id: e.target.value })}
            placeholder="Cole a URL ou o ID do vídeo"
          />
          <p className="text-xs text-muted-foreground">
            Aceita a URL completa do YouTube ou apenas o ID do vídeo.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lesson-duration">Duração (segundos, opcional)</Label>
          <Input
            id="lesson-duration"
            type="number"
            value={formData.duration_seconds}
            onChange={(e) =>
              setFormData({
                ...formData,
                duration_seconds: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
          />
        </div>
      </div>
    </FormDrawer>
  )
}
