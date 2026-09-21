"use client"

import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Circle, Loader2, ShieldCheck, ShieldX } from "lucide-react"
import { useMemberJourneyTracks, useApproveJourneyStep, useRevokeJourneyStepApproval } from "@/lib/hooks/use-journey-tracks"
import type { JourneyTrackStepWithProgress } from "@/lib/api/types/journey-tracks"
import type { AdminUser } from "@/lib/api/types"

interface StepRowProps {
  step: JourneyTrackStepWithProgress
  memberId: number
}

function StepRow({ step, memberId }: StepRowProps) {
  const approveMutation = useApproveJourneyStep()
  const revokeMutation = useRevokeJourneyStepApproval()
  const isActionable = step.type === "manual_approval"
  const isPending = approveMutation.isPending || revokeMutation.isPending
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false)

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ memberId, stepId: step.id })
      toast.success("Etapa aprovada!")
    } catch {
      toast.error("Erro ao aprovar etapa.")
    }
  }

  const handleRevoke = async () => {
    try {
      await revokeMutation.mutateAsync({ memberId, stepId: step.id })
      toast.success("Aprovação revogada.")
    } catch {
      toast.error("Erro ao revogar aprovação.")
    } finally {
      setIsRevokeDialogOpen(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card px-3 py-3">
      <div className="flex items-start gap-3">
        {step.completed ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        ) : (
          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
              {step.title}
            </span>
            {step.completed ? (
              <Badge variant="outline" className="border-primary/40 text-xs text-primary">
                Concluído
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Pendente
              </Badge>
            )}
          </div>
          {step.description && <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>}
          {step.completed && step.completed_at && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {format(new Date(step.completed_at), "dd/MM/yyyy")}
              {step.completed_by_name && ` · aprovado por ${step.completed_by_name}`}
            </p>
          )}
        </div>

        {isActionable && (
          <div className="shrink-0">
            {step.completed ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRevokeDialogOpen(true)}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">Revogar</span>
                </Button>
                <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revogar aprovação?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação removerá a conclusão registrada para a etapa &quot;{step.title}&quot;.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleRevoke}
                      >
                        Revogar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleApprove} disabled={isPending}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                <span className="ml-1.5">Aprovar</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface JourneyTracksSheetProps {
  member: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JourneyTracksSheet({ member, open, onOpenChange }: JourneyTracksSheetProps) {
  const [expandedTrackIds, setExpandedTrackIds] = useState<Set<number>>(new Set())
  const { data: journeyTracks = [], isLoading } = useMemberJourneyTracks(member?.id ?? null)

  if (!member) return null

  const toggleTrack = (trackId: number) => {
    setExpandedTrackIds((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) {
        next.delete(trackId)
      } else {
        next.add(trackId)
      }
      return next
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{member.name} — Trilhos</SheetTitle>
          <SheetDescription>Progresso do membro nos trilhos de jornada configuráveis</SheetDescription>
        </SheetHeader>

        <SheetBody>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : journeyTracks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum trilho ativo configurado.
            </p>
          ) : (
            <div className="space-y-4">
              {journeyTracks.map(({ track, steps, progress_percentage }) => {
                const isExpanded = expandedTrackIds.has(track.id)
                return (
                  <div key={track.id} className="rounded-lg border bg-muted/20 p-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() => toggleTrack(track.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{track.title}</p>
                        {track.description && (
                          <p className="text-xs text-muted-foreground">{track.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-lg font-bold text-primary">{progress_percentage}%</span>
                    </button>
                    <Progress value={progress_percentage} className="mt-2" />

                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {steps.map((step) => (
                          <StepRow key={step.id} step={step} memberId={member.id} />
                        ))}
                      </div>
                    )}

                    {!isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 px-2 text-xs"
                        onClick={() => toggleTrack(track.id)}
                      >
                        Ver etapas
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
