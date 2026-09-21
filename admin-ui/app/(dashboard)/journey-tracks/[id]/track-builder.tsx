"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  BookOpen,
  ShieldCheck,
  Info,
} from "lucide-react"
import { useJourneyTracks, useCreateJourneyTrackStep, useUpdateJourneyTrackStep, useDeleteJourneyTrackStep, useReorderJourneyTrackSteps } from "@/lib/hooks/use-journey-tracks"
import type { CreateJourneyTrackStepRequest, JourneyTrackStep, JourneyTrackStepType, UpdateJourneyTrackStepRequest } from "@/lib/api/types/journey-tracks"
import { StepFormDialog } from "./step-form-dialog"

const STEP_TYPE_ICON: Record<JourneyTrackStepType, typeof BookOpen> = {
  course_completion: BookOpen,
  manual_approval: ShieldCheck,
  informational: Info,
}

const STEP_TYPE_LABELS: Record<JourneyTrackStepType, string> = {
  course_completion: "Conclusão de curso",
  manual_approval: "Aprovação manual",
  informational: "Informativo",
}

interface TrackBuilderProps {
  trackId: number
}

export function TrackBuilder({ trackId }: TrackBuilderProps) {
  const { data: tracks = [], isLoading, error } = useJourneyTracks()
  const track = tracks.find((t) => t.id === trackId) ?? null

  const createMutation = useCreateJourneyTrackStep(trackId)
  const updateMutation = useUpdateJourneyTrackStep(trackId)
  const deleteMutation = useDeleteJourneyTrackStep(trackId)
  const reorderMutation = useReorderJourneyTrackSteps(trackId)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<JourneyTrackStep | null>(null)
  const [deletingStepId, setDeletingStepId] = useState<number | null>(null)

  const sortedSteps = track ? [...track.steps].sort((a, b) => a.sort_order - b.sort_order) : []

  const handleCreate = () => {
    setEditingStep(null)
    setIsFormOpen(true)
  }

  const handleEdit = (step: JourneyTrackStep) => {
    setEditingStep(step)
    setIsFormOpen(true)
  }

  const handleSubmit = async (data: CreateJourneyTrackStepRequest | UpdateJourneyTrackStepRequest) => {
    try {
      if (editingStep) {
        await updateMutation.mutateAsync({ stepId: editingStep.id, data })
      } else {
        await createMutation.mutateAsync(data as CreateJourneyTrackStepRequest)
      }
      setIsFormOpen(false)
      setEditingStep(null)
    } catch (err) {
      console.error("Failed to save journey track step:", err)
    }
  }

  const handleDelete = async (stepId: number) => {
    try {
      await deleteMutation.mutateAsync(stepId)
      setDeletingStepId(null)
    } catch (err) {
      console.error("Failed to delete journey track step:", err)
    }
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sortedSteps.length) return

    const reordered = [...sortedSteps]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    reorderMutation.mutate(reordered.map((s) => s.id))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-center py-8">Erro ao carregar o trilho. Tente novamente mais tarde.</p>
  }

  if (!track) {
    return <p className="text-muted-foreground text-center py-8">Trilho não encontrado.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/journey-tracks">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar para Trilhos
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{track.title}</h1>
        {track.description && <p className="text-muted-foreground">{track.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Etapas</CardTitle>
              <CardDescription>{sortedSteps.length} etapa(s) cadastrada(s)</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Etapa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedSteps.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma etapa cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {sortedSteps.map((step, index) => {
                const Icon = STEP_TYPE_ICON[step.type]
                return (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3"
                  >
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => handleMove(index, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === sortedSteps.length - 1 || reorderMutation.isPending}
                        onClick={() => handleMove(index, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{step.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {STEP_TYPE_LABELS[step.type]}
                        </Badge>
                      </div>
                      {step.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{step.description}</p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                          {reorderMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTimeout(() => handleEdit(step), 0)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTimeout(() => setDeletingStepId(step.id), 0)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <StepFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingStep(null)
        }}
        step={editingStep}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={deletingStepId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingStepId(null)
        }}
        entityName="esta etapa"
        onConfirm={() => {
          if (deletingStepId !== null) handleDelete(deletingStepId)
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
