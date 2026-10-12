"use client"

import { useState } from "react"
import { format, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertTriangle, Dices, Loader2, RefreshCw, SkipForward, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getApiErrorMessage } from "@/lib/api/client"
import {
  useAddLifeGroupTaskSkip,
  useGenerateLifeGroupTasks,
  useLifeGroupTaskMeeting,
  useLifeGroupTaskMembers,
  useReassignLifeGroupTask,
  useRemoveLifeGroupTaskSkip,
  useRerollLifeGroupTask,
} from "@/lib/hooks/use-life-group-tasks"
import type { LifeGroup, LifeGroupTaskAssignment } from "@/lib/api/types"
import { nextMeetingDate } from "./next-meeting-date"

const STATUS_LABELS: Record<LifeGroupTaskAssignment["status"], string> = {
  assigned: "Atribuída",
  declined: "Recusada",
  completed: "Concluída",
}

const SOURCE_LABELS: Record<LifeGroupTaskAssignment["source"], string> = {
  auto: "Sorteio",
  manual: "Manual",
  reroll: "Re-sorteio",
}

function formatDate(iso: string): string {
  return format(parse(iso, "yyyy-MM-dd", new Date()), "EEEE, dd/MM/yyyy", { locale: ptBR })
}

export function LifeGroupTaskMeetingTab({ lifeGroup }: { lifeGroup: LifeGroup }) {
  const lifeGroupId = lifeGroup.id
  const hasFixedDay = nextMeetingDate(lifeGroup.meeting_day) !== ""
  const [date, setDate] = useState<string>(() => nextMeetingDate(lifeGroup.meeting_day))

  const { data: meeting, isLoading, error } = useLifeGroupTaskMeeting(lifeGroupId, date)
  const { data: members = [] } = useLifeGroupTaskMembers(lifeGroupId)

  const generate = useGenerateLifeGroupTasks(lifeGroupId)
  const reroll = useRerollLifeGroupTask(lifeGroupId)
  const reassign = useReassignLifeGroupTask(lifeGroupId)
  const addSkip = useAddLifeGroupTaskSkip(lifeGroupId)
  const removeSkip = useRemoveLifeGroupTaskSkip(lifeGroupId)

  const skipped = meeting?.skipped ?? false
  const assignments = meeting?.assignments ?? []
  const unassigned = meeting?.unassigned_templates ?? []
  const hasAssignments = assignments.length > 0

  const handleGenerate = () => {
    generate.mutate(date, {
      onSuccess: (result) => {
        if (result.unassignable_template_ids.length > 0) {
          toast.warning("Algumas tarefas ficaram sem responsável: não há membros elegíveis.")
        } else {
          toast.success("Tarefas sorteadas")
        }
      },
      onError: (err) => toast.error(getApiErrorMessage(err, "Falha ao sortear as tarefas.")),
    })
  }

  const handleReroll = (assignment: LifeGroupTaskAssignment) => {
    reroll.mutate(assignment.id, {
      onSuccess: () => toast.success(`${assignment.task_name}: novo responsável sorteado`),
      // 409 = nobody else eligible; the backend message explains.
      onError: (err) => toast.error(getApiErrorMessage(err, "Falha ao re-sortear a tarefa.")),
    })
  }

  const handleReassign = (assignment: LifeGroupTaskAssignment, userId: number) => {
    if (userId === assignment.user_id) return
    reassign.mutate(
      { assignmentId: assignment.id, userId },
      {
        onSuccess: () => toast.success("Responsável atualizado"),
        onError: (err) => toast.error(getApiErrorMessage(err, "Falha ao trocar o responsável.")),
      }
    )
  }

  const handleToggleSkip = () => {
    const options = {
      onSuccess: () => toast.success(skipped ? "Data reativada" : "Data marcada como sem encontro"),
      onError: (err: unknown) => toast.error(getApiErrorMessage(err, "Falha ao atualizar a data.")),
    }
    if (skipped) {
      removeSkip.mutate(date, options)
    } else {
      addSkip.mutate(date, options)
    }
  }

  const isBusy =
    generate.isPending || reroll.isPending || reassign.isPending || addSkip.isPending || removeSkip.isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Data do encontro</Label>
          <DatePickerInput value={date} onChange={setDate} className="w-[180px]" />
        </div>
        <Button onClick={handleGenerate} disabled={!date || skipped || isBusy}>
          {generate.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Dices className="mr-2 h-4 w-4" />
          )}
          {hasAssignments ? "Sortear tarefas faltantes" : "Sortear tarefas"}
        </Button>
        <Button variant="outline" onClick={handleToggleSkip} disabled={!date || isBusy}>
          {skipped ? (
            <Undo2 className="mr-2 h-4 w-4" />
          ) : (
            <SkipForward className="mr-2 h-4 w-4" />
          )}
          {skipped ? "Reativar data" : "Sem encontro nesta data"}
        </Button>
      </div>

      {!hasFixedDay && (
        <p className="text-xs text-muted-foreground">
          Este grupo não tem dia fixo de encontro. Escolha a data manualmente.
        </p>
      )}
      {date && (
        <p className="text-sm text-muted-foreground capitalize">{formatDate(date)}</p>
      )}

      {skipped && (
        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
          Esta data está marcada como <strong>sem encontro</strong>. Nenhuma tarefa será sorteada
          nem notificada, e ela não conta no histórico de rodízio.
        </div>
      )}

      {!skipped && hasAssignments && unassigned.length > 0 && (
        <UnassignedWarning names={unassigned.map((u) => u.name)} />
      )}

      {isLoading && date ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Erro ao carregar as tarefas deste encontro.")}
        </p>
      ) : !skipped && !hasAssignments ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há tarefas sorteadas para esta data. Elas são sorteadas automaticamente
          alguns dias antes do encontro, ou você pode sortear agora.
        </p>
      ) : hasAssignments ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead className="w-[230px]">Responsável</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium">{assignment.task_name}</TableCell>
                <TableCell>
                  <Select
                    value={String(assignment.user_id)}
                    onValueChange={(v) => handleReassign(assignment, Number(v))}
                    disabled={isBusy}
                  >
                    <SelectTrigger aria-label={`Responsável por ${assignment.task_name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Keep the current assignee selectable even if they left the roster. */}
                      {!members.some((m) => m.user_id === assignment.user_id) && (
                        <SelectItem value={String(assignment.user_id)}>
                          {assignment.user_name}
                        </SelectItem>
                      )}
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={String(m.user_id)}>
                          {m.name}
                          {m.eligible ? "" : " (inelegível)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={assignment.status === "declined" ? "destructive" : "secondary"}>
                      {STATUS_LABELS[assignment.status]}
                    </Badge>
                    <Badge variant="outline">{SOURCE_LABELS[assignment.source]}</Badge>
                    {!assignment.assignee_eligible && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Não elegível
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleReroll(assignment)}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Re-sortear
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}

function UnassignedWarning({ names }: { names: string[] }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p>
        Sem responsável para: <strong>{names.join(", ")}</strong>. Não há membros elegíveis
        disponíveis; ajuste a elegibilidade na aba Membros ou atribua manualmente depois de
        sortear.
      </p>
    </div>
  )
}
