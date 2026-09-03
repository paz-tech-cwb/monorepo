"use client"

import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { useMemberJourney, useUpdateMemberStage } from "@/lib/hooks/use-member-journey"
import { JOURNEY_STAGES } from "@/lib/api/types/member-journey"
import type { AdminUser } from "@/lib/api/types"
import type { JourneyProgress, JourneyStageId, JourneyStageKey } from "@/lib/api/types"

function inferStagesFromMember(member: AdminUser): Partial<Record<JourneyStageKey, string>> {
  const inferred: Partial<Record<JourneyStageKey, string>> = {}
  inferred.registration = member.membership_date ?? member.created_at
  if (member.life_groups.length > 0) inferred.life_group = member.updated_at
  return inferred
}

interface ProgressStepItemProps {
  stageKey: JourneyStageKey
  label: string
  optional: boolean
  completed: boolean
  completedAt?: string
  note?: string
  isInferred?: boolean
}

function ProgressStepItem({
  label,
  optional,
  completed,
  completedAt,
  note,
  isInferred,
}: ProgressStepItemProps) {
  return (
    <div className="rounded-lg border bg-card px-3 py-3">
      <div className="flex items-start gap-3">
        {completed ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        ) : (
          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-medium ${completed ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {completed ? (
              <Badge variant="outline" className="border-primary/40 text-xs text-primary">
                Concluído
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Pendente
              </Badge>
            )}
            {optional && (
              <Badge variant="outline" className="text-xs">
                Opcional
              </Badge>
            )}
            {isInferred && completed && (
              <Badge variant="secondary" className="text-xs">
                Estimado
              </Badge>
            )}
          </div>
          {completed && completedAt && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {format(new Date(completedAt), "dd/MM/yyyy")}
            </p>
          )}
          {note && (
            <p className="mt-0.5 text-xs italic text-muted-foreground">&ldquo;{note}&rdquo;</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface UpdateStageFormProps {
  memberId: number
  onSuccess: () => void
}

function UpdateStageForm({ memberId, onSuccess }: UpdateStageFormProps) {
  const updateMutation = useUpdateMemberStage()
  const [stageId, setStageId] = useState<string>("")
  const [completedAt, setCompletedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [note, setNote] = useState("")

  const handleSave = async () => {
    if (!stageId) {
      toast.error("Selecione uma etapa.")
      return
    }
    try {
      await updateMutation.mutateAsync({
        memberId,
        data: {
          stage_id: Number(stageId) as JourneyStageId,
          completed: true,
          completed_at: completedAt,
          note: note || undefined,
        },
      })
      toast.success("Etapa atualizada!")
      setStageId("")
      setNote("")
      onSuccess()
    } catch {
      toast.error("Erro ao atualizar etapa.")
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <p className="text-sm font-medium">Atualizar Etapa</p>
      <div>
        <Label className="mb-1 block text-xs">Etapa</Label>
        <Select value={stageId} onValueChange={setStageId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma etapa..." />
          </SelectTrigger>
          <SelectContent>
            {JOURNEY_STAGES.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.label}{s.optional ? " (opcional)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-1 block text-xs">Data de conclusão</Label>
        <Input
          type="date"
          value={completedAt}
          onChange={(e) => setCompletedAt(e.target.value)}
        />
      </div>
      <div>
        <Label className="mb-1 block text-xs">Nota (opcional)</Label>
        <Textarea
          placeholder="Observações..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="resize-none"
          rows={2}
        />
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Salvar
      </Button>
    </div>
  )
}

interface JourneySheetProps {
  member: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMPTY_PROGRESS: JourneyProgress = {
  completion_percentage: 0,
  completed_required_steps: 0,
  total_required_steps: JOURNEY_STAGES.filter((stage) => !stage.optional).length,
  completed_optional_steps: 0,
  total_optional_steps: JOURNEY_STAGES.filter((stage) => stage.optional).length,
  is_complete: false,
}

export function JourneySheet({ member, open, onOpenChange }: JourneySheetProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const { data: journey, isLoading } = useMemberJourney(member?.id ?? null)

  if (!member) return null

  const inferred = inferStagesFromMember(member)

  const getStageState = (stageId: JourneyStageId, stageKey: JourneyStageKey) => {
    if (journey) {
      const apiStage = journey.stages.find((s) => s.stage_id === stageId)
      if (apiStage) {
        return {
          completed: apiStage.completed,
          completedAt: apiStage.completed_at,
          note: apiStage.note,
          isInferred: false,
        }
      }
    }

    const inferredDate = inferred[stageKey]
    if (inferredDate) {
      return { completed: true, completedAt: inferredDate, note: undefined, isInferred: true }
    }
    return { completed: false, completedAt: undefined, note: undefined, isInferred: false }
  }

  const localStages = JOURNEY_STAGES.map((stage) => ({
    stage,
    state: getStageState(stage.id, stage.key),
  }))
  const localProgress = {
    ...EMPTY_PROGRESS,
    completed_required_steps: localStages.filter(({ stage, state }) => !stage.optional && state.completed).length,
    completed_optional_steps: localStages.filter(({ stage, state }) => stage.optional && state.completed).length,
  }
  localProgress.completion_percentage = Math.round(
    (localProgress.completed_required_steps / localProgress.total_required_steps) * 100
  )
  localProgress.is_complete = localProgress.completion_percentage === 100
  const progress = journey?.progress ?? localProgress

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{member.name} — Jornada</SheetTitle>
          <SheetDescription>
            Life Group: {member.life_groups.map((g) => g.name).join(", ") || "—"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {!journey && !isLoading && (
            <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              Etapas estimadas com base no cadastro
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-lg" />
              {Array.from({ length: JOURNEY_STAGES.length }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Progresso da jornada</p>
                    <p className="text-xs text-muted-foreground">
                      {progress.completed_required_steps} de {progress.total_required_steps} etapas obrigatórias concluídas
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {progress.completion_percentage}%
                  </span>
                </div>
                <Progress value={progress.completion_percentage} />
                <p className="mt-2 text-xs text-muted-foreground">
                  O Trilho do Líder de Life Group é opcional e não bloqueia a conclusão geral.
                  {progress.total_optional_steps > 0 && ` Opcional: ${progress.completed_optional_steps}/${progress.total_optional_steps}.`}
                </p>
              </div>

              <div className="space-y-2">
                {localStages.map(({ stage, state }) => (
                  <ProgressStepItem
                    key={stage.id}
                    stageKey={stage.key}
                    label={stage.label}
                    optional={stage.optional}
                    completed={state.completed}
                    completedAt={state.completedAt}
                    note={state.note}
                    isInferred={state.isInferred}
                  />
                ))}
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter className="flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowUpdateForm((v) => !v)}
          >
            {showUpdateForm ? "Ocultar formulário" : "Atualizar Etapa"}
          </Button>
          {showUpdateForm && (
            <UpdateStageForm
              memberId={member.id}
              onSuccess={() => setShowUpdateForm(false)}
            />
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
