"use client"

import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Circle, Loader2, Copy } from "lucide-react"
import { useMemberJourney, useUpdateMemberStage } from "@/lib/hooks/use-member-journey"
import { JOURNEY_STAGES } from "@/lib/api/types/member-journey"
import type { AdminUser } from "@/lib/api/types"
import type { JourneyStageId, JourneyStageKey } from "@/lib/api/types"

const STAGE_MESSAGES: Record<JourneyStageKey, { title: string; message: string }> = {
  salvation:      { title: "Bem-vindo!",                    message: "Estamos felizes em ter você conosco. Deus tem um plano lindo para sua vida!" },
  registration:   { title: "Cadastro confirmado",           message: "Seu cadastro está completo. Bem-vindo à família Paz!" },
  first_courses:  { title: "Comece sua jornada",            message: "Você tem cursos esperando. Cada passo importa — vamos juntos!" },
  discovery:      { title: "Conheça nossa igreja",          message: "Participe do próximo Evento de Descoberta e conheça nossa história e pastores." },
  life_group:     { title: "Entre em um Life Group",        message: "Comunidade é fundamental. Encontre o seu grupo e cresça junto!" },
  discipleship:   { title: "Próximo passo: discipulado",    message: "Seu líder de life group quer caminhar com você. Aceite esse convite!" },
  water_baptism:  { title: "Batismo nas Águas",             message: "Este é um passo público de fé. O próximo batismo está chegando — você vai dar esse passo?" },
  disciple_maker: { title: "Parabéns, líder!",              message: "Você chegou à etapa mais impactante: discipular outros. A missão continua em você." },
}

function inferStagesFromMember(member: AdminUser): Partial<Record<JourneyStageKey, string>> {
  const inferred: Partial<Record<JourneyStageKey, string>> = {}
  inferred.registration = member.membership_date ?? member.created_at
  if (member.life_groups.length > 0) inferred.life_group = member.updated_at
  return inferred
}

interface StepperItemProps {
  stageId: JourneyStageId
  stageKey: JourneyStageKey
  label: string
  completed: boolean
  completedAt?: string
  note?: string
  isInferred?: boolean
  isCurrent: boolean
}

function StepperItem({
  stageKey,
  label,
  completed,
  completedAt,
  note,
  isInferred,
  isCurrent,
}: StepperItemProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        ) : isCurrent ? (
          <div className="relative mt-0.5">
            <Circle className="h-5 w-5 text-primary shrink-0" />
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
          </div>
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${
              completed
                ? "text-foreground"
                : isCurrent
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
          {isCurrent && !completed && (
            <Badge variant="outline" className="text-xs text-primary border-primary/40">
              Em andamento
            </Badge>
          )}
          {isInferred && completed && (
            <Badge variant="secondary" className="text-xs">
              Estimado
            </Badge>
          )}
        </div>
        {completed && completedAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(completedAt), "dd/MM/yyyy")}
          </p>
        )}
        {note && (
          <p className="text-xs text-muted-foreground italic mt-0.5">"{note}"</p>
        )}
        {!completed && !isCurrent && (
          <p className="text-xs text-muted-foreground mt-0.5">—</p>
        )}
        {/* Message suggestion for current incomplete stage */}
        {isCurrent && !completed && (
          <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-0.5">{STAGE_MESSAGES[stageKey].title}</p>
            <p className="leading-relaxed">{STAGE_MESSAGES[stageKey].message}</p>
            <button
              className="mt-1.5 inline-flex items-center gap-1 text-primary hover:underline"
              onClick={() => {
                navigator.clipboard.writeText(STAGE_MESSAGES[stageKey].message)
                toast.success("Mensagem copiada!")
              }}
            >
              <Copy className="h-3 w-3" />
              Copiar mensagem
            </button>
          </div>
        )}
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
        <Label className="text-xs mb-1 block">Etapa</Label>
        <Select value={stageId} onValueChange={setStageId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma etapa..." />
          </SelectTrigger>
          <SelectContent>
            {JOURNEY_STAGES.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs mb-1 block">Data de conclusão</Label>
        <Input
          type="date"
          value={completedAt}
          onChange={(e) => setCompletedAt(e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">Nota (opcional)</Label>
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

export function JourneySheet({ member, open, onOpenChange }: JourneySheetProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const { data: journey, isLoading } = useMemberJourney(member?.id ?? null)

  if (!member) return null

  const inferred = inferStagesFromMember(member)

  const getStageState = (stageId: JourneyStageId, stageKey: JourneyStageKey) => {
    // Prefer API data when available
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
    // Fall back to local inference
    const inferredDate = inferred[stageKey]
    if (inferredDate) {
      return { completed: true, completedAt: inferredDate, note: undefined, isInferred: true }
    }
    return { completed: false, completedAt: undefined, note: undefined, isInferred: false }
  }

  const currentStageId: JourneyStageId = journey?.current_stage_id ?? 2

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle>{member.name} — Jornada</SheetTitle>
          <SheetDescription>
            Life Group: {member.life_groups.map((g) => g.name).join(", ") || "—"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2 pr-3">
          {!journey && !isLoading && (
            <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              Etapas estimadas com base no cadastro
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-md" />
              ))}
            </div>
          ) : (
            <div>
              {JOURNEY_STAGES.map((stage) => {
                const { completed, completedAt, note, isInferred } = getStageState(
                  stage.id as JourneyStageId,
                  stage.key
                )
                const isCurrent = !completed && stage.id === currentStageId
                return (
                  <StepperItem
                    key={stage.id}
                    stageId={stage.id as JourneyStageId}
                    stageKey={stage.key}
                    label={stage.label}
                    completed={completed}
                    completedAt={completedAt}
                    note={note}
                    isInferred={isInferred}
                    isCurrent={isCurrent}
                  />
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t px-4 pt-4 pb-2 space-y-2">
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
        </div>
      </SheetContent>
    </Sheet>
  )
}
