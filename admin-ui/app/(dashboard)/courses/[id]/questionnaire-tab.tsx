"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Plus, Edit, Trash2, Loader2, GripVertical } from "lucide-react"
import {
  useCourseQuestionnaire,
  useUpsertCourseQuestionnaire,
  useDeleteCourseQuestionnaire,
} from "@/lib/hooks/use-course-questionnaire"
import type { Question, Questionnaire } from "@/lib/api/types/academy"
import { QuestionFormDialog } from "./question-form-dialog"

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: "Escolha única",
  multiple_choice: "Múltipla escolha",
  free_text: "Resposta livre",
}

interface QuestionnaireTabProps {
  courseId: string
}

interface QuestionnaireFormState {
  title: string
  description: string
  passing_score_percentage: number
  max_attempts: number | ""
  questions: Question[]
}

function toFormState(questionnaire: Questionnaire | null): QuestionnaireFormState {
  if (!questionnaire) {
    return {
      title: "",
      description: "",
      passing_score_percentage: 70,
      max_attempts: "",
      questions: [],
    }
  }
  return {
    title: questionnaire.title,
    description: questionnaire.description ?? "",
    passing_score_percentage: questionnaire.passing_score_percentage,
    max_attempts: questionnaire.max_attempts ?? "",
    questions: questionnaire.questions,
  }
}

export function QuestionnaireTab({ courseId }: QuestionnaireTabProps) {
  const { data: questionnaire, isLoading, error } = useCourseQuestionnaire(courseId)
  const upsertMutation = useUpsertCourseQuestionnaire(courseId)
  const deleteMutation = useDeleteCourseQuestionnaire(courseId)

  const [formState, setFormState] = useState<QuestionnaireFormState>(toFormState(null))
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  const [deletingQuestionIndex, setDeletingQuestionIndex] = useState<number | null>(null)
  const [isDeletingQuestionnaire, setIsDeletingQuestionnaire] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setFormState(toFormState(questionnaire ?? null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaire, isLoading])

  const handleAddQuestion = () => {
    setEditingQuestionIndex(null)
    setIsQuestionFormOpen(true)
  }

  const handleEditQuestion = (index: number) => {
    setEditingQuestionIndex(index)
    setIsQuestionFormOpen(true)
  }

  const handleQuestionSubmit = (question: Question) => {
    setFormState((prev) => {
      const questions = [...prev.questions]
      if (editingQuestionIndex !== null) {
        questions[editingQuestionIndex] = question
      } else {
        questions.push(question)
      }
      return { ...prev, questions }
    })
    setIsQuestionFormOpen(false)
    setEditingQuestionIndex(null)
  }

  const handleDeleteQuestion = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }))
    setDeletingQuestionIndex(null)
  }

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        title: formState.title,
        description: formState.description || null,
        passing_score_percentage: formState.passing_score_percentage,
        max_attempts: formState.max_attempts === "" ? null : Number(formState.max_attempts),
        questions: formState.questions.map((q, index) => ({
          ...q,
          sort_order: index,
        })),
      })
    } catch (err) {
      console.error("Failed to save questionnaire:", err)
    }
  }

  const handleDeleteQuestionnaire = async () => {
    try {
      await deleteMutation.mutateAsync()
      setIsDeletingQuestionnaire(false)
      setFormState(toFormState(null))
    } catch (err) {
      console.error("Failed to delete questionnaire:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-center py-8">Erro ao carregar questionário.</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configurações do Questionário</CardTitle>
              <CardDescription>Título, descrição e regras de aprovação</CardDescription>
            </div>
            {questionnaire && (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setIsDeletingQuestionnaire(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Questionário
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="questionnaire-title">Título</Label>
            <Input
              id="questionnaire-title"
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              placeholder="Título do questionário"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="questionnaire-description">Descrição</Label>
            <Textarea
              id="questionnaire-description"
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              placeholder="Descrição do questionário"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="questionnaire-passing-score">Nota mínima (%)</Label>
              <Input
                id="questionnaire-passing-score"
                type="number"
                min={0}
                max={100}
                value={formState.passing_score_percentage}
                onChange={(e) =>
                  setFormState({ ...formState, passing_score_percentage: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="questionnaire-max-attempts">Tentativas máximas (opcional)</Label>
              <Input
                id="questionnaire-max-attempts"
                type="number"
                min={1}
                value={formState.max_attempts}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    max_attempts: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Perguntas</CardTitle>
              <CardDescription>{formState.questions.length} pergunta(s)</CardDescription>
            </div>
            <Button onClick={handleAddQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pergunta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formState.questions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma pergunta cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {formState.questions.map((question, index) => (
                <div key={question.id ?? index} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{question.text}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                          <span className="text-xs text-muted-foreground">{question.points ?? 1} pt(s)</span>
                        </div>
                        {question.type !== "free_text" && question.options && question.options.length > 0 && (
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {question.options.map((option, optIndex) => (
                              <li key={option.id ?? optIndex} className={option.is_correct ? "text-foreground font-medium" : ""}>
                                {option.is_correct ? "✓ " : "- "}
                                {option.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditQuestion(index)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeletingQuestionIndex(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsertMutation.isPending || !formState.title}>
          {upsertMutation.isPending ? "Salvando..." : "Salvar Questionário"}
        </Button>
      </div>

      <QuestionFormDialog
        open={isQuestionFormOpen}
        onOpenChange={(open) => {
          setIsQuestionFormOpen(open)
          if (!open) setEditingQuestionIndex(null)
        }}
        question={editingQuestionIndex !== null ? formState.questions[editingQuestionIndex] : null}
        onSubmit={handleQuestionSubmit}
      />

      <ConfirmDeleteDialog
        open={deletingQuestionIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingQuestionIndex(null)
        }}
        entityName="esta pergunta"
        onConfirm={() => {
          if (deletingQuestionIndex !== null) handleDeleteQuestion(deletingQuestionIndex)
        }}
      />

      <ConfirmDeleteDialog
        open={isDeletingQuestionnaire}
        onOpenChange={setIsDeletingQuestionnaire}
        entityName="o questionário"
        onConfirm={handleDeleteQuestionnaire}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
