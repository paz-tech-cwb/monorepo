"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDrawer } from "@/components/ui/form-drawer"
import { useCourses } from "@/lib/hooks/use-courses"
import type {
  CreateJourneyTrackStepRequest,
  JourneyTrackStep,
  JourneyTrackStepType,
  UpdateJourneyTrackStepRequest,
} from "@/lib/api/types/journey-tracks"

const STEP_TYPE_LABELS: Record<JourneyTrackStepType, string> = {
  course_completion: "Conclusão de curso",
  manual_approval: "Aprovação manual",
  informational: "Informativo",
}

interface StepFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: JourneyTrackStep | null
  isLoading: boolean
  onSubmit: (data: CreateJourneyTrackStepRequest | UpdateJourneyTrackStepRequest) => void
}

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "informational" as JourneyTrackStepType,
  course_id: "",
  external_url: "",
}

export function StepFormDialog({ open, onOpenChange, step, isLoading, onSubmit }: StepFormDialogProps) {
  const { data: courses = [], isLoading: coursesLoading } = useCourses()
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    if (step) {
      setFormData({
        title: step.title,
        description: step.description ?? "",
        type: step.type,
        course_id: step.course_id ?? "",
        external_url: step.external_url ?? "",
      })
    } else {
      setFormData(EMPTY_FORM)
    }
  }, [step, open])

  const handleSubmit = () => {
    onSubmit({
      title: formData.title,
      description: formData.description || null,
      type: formData.type,
      course_id: formData.type === "course_completion" ? formData.course_id || null : null,
      external_url: formData.type === "informational" ? formData.external_url || null : null,
    })
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={step ? "Editar Etapa" : "Nova Etapa"}
      description="Preencha os dados da etapa do trilho"
      isLoading={isLoading}
      onSubmit={handleSubmit}
      submitLabel={step ? "Salvar" : "Criar Etapa"}
    >
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="step-type">Tipo de etapa</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as JourneyTrackStepType })}
          >
            <SelectTrigger id="step-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STEP_TYPE_LABELS) as JourneyTrackStepType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {STEP_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="step-title">Título</Label>
          <Input
            id="step-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Título da etapa"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="step-description">Descrição</Label>
          <Textarea
            id="step-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição da etapa"
          />
        </div>

        {formData.type === "course_completion" &&
          (coursesLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="step-course">Curso</Label>
              <Select
                value={formData.course_id}
                onValueChange={(value) => setFormData({ ...formData, course_id: value })}
              >
                <SelectTrigger id="step-course">
                  <SelectValue placeholder="Selecione um curso..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A etapa é concluída automaticamente quando o membro finaliza este curso.
              </p>
            </div>
          ))}

        {formData.type === "informational" && (
          <div className="space-y-1.5">
            <Label htmlFor="step-url">URL externa (opcional)</Label>
            <Input
              id="step-url"
              value={formData.external_url}
              onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        )}

        {formData.type === "manual_approval" && (
          <p className="text-xs text-muted-foreground">
            Esta etapa só pode ser marcada como concluída por um líder, no perfil do membro.
          </p>
        )}
      </div>
    </FormDrawer>
  )
}
