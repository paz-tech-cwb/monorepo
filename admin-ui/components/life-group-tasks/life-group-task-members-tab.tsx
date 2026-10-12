"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage } from "@/lib/api/client"
import {
  useLifeGroupTaskMembers,
  useLifeGroupTaskOverrides,
  useLifeGroupTaskSettings,
  usePutLifeGroupTaskMembers,
  usePutLifeGroupTaskSettings,
} from "@/lib/hooks/use-life-group-tasks"
import type { LifeGroupTaskMember } from "@/lib/api/types"

function sourceBadge(member: LifeGroupTaskMember) {
  switch (member.eligibility_source) {
    case "manual":
      return { label: "Definido pelo líder", variant: "default" as const }
    case "leader":
      return { label: "Líder do grupo", variant: "secondary" as const }
    case "auto":
      return {
        label: `Automático (${member.present_count}/${member.min_present_meetings} presenças)`,
        variant: "secondary" as const,
      }
    case "pending":
    default:
      return {
        label: `Automático: aguardando presenças (${member.present_count}/${member.min_present_meetings})`,
        variant: "outline" as const,
      }
  }
}

export function LifeGroupTaskMembersTab({ lifeGroupId }: { lifeGroupId: number }) {
  const { data: members, isLoading, error } = useLifeGroupTaskMembers(lifeGroupId)

  return (
    <div className="space-y-6">
      <SettingsSection lifeGroupId={lifeGroupId} />

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Quem participa do sorteio</h3>
          <p className="text-xs text-muted-foreground">
            Novos membros entram no sorteio automaticamente depois do número mínimo de presenças.
            Líder e co-líder participam por padrão. Você pode forçar a participação ou a exclusão
            de qualquer pessoa.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, "Erro ao carregar os membros.")}
          </p>
        ) : !members || members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este grupo não tem membros ativos.</p>
        ) : (
          members.map((member) => (
            <MemberRow key={member.user_id} lifeGroupId={lifeGroupId} member={member} />
          ))
        )}
      </div>
    </div>
  )
}

function SettingsSection({ lifeGroupId }: { lifeGroupId: number }) {
  const { data: settings } = useLifeGroupTaskSettings(lifeGroupId)
  const save = usePutLifeGroupTaskSettings(lifeGroupId)
  const [value, setValue] = useState("3")

  useEffect(() => {
    if (settings) setValue(String(settings.min_present_meetings))
  }, [settings])

  const parsed = Number(value)
  const isValid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 52

  const handleSave = () => {
    if (!isValid) return
    save.mutate(parsed, {
      onSuccess: () => toast.success("Configuração salva"),
      onError: (err) => toast.error(getApiErrorMessage(err, "Falha ao salvar a configuração.")),
    })
  }

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <Label htmlFor="min-present-meetings">Presenças mínimas para entrar no sorteio</Label>
      <div className="flex items-center gap-2">
        <Input
          id="min-present-meetings"
          type="number"
          min={0}
          max={52}
          className="w-24"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">encontros</span>
        <Button size="sm" onClick={handleSave} disabled={!isValid || save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Membros sem definição manual passam a participar depois dessa quantidade de presenças
        registradas neste grupo (padrão: 3). Use 0 para incluir todos de imediato.
      </p>
      {!isValid && <p className="text-xs text-destructive">Informe um número inteiro entre 0 e 52.</p>}
    </div>
  )
}

function MemberRow({ lifeGroupId, member }: { lifeGroupId: number; member: LifeGroupTaskMember }) {
  const { data: overrides = [] } = useLifeGroupTaskOverrides(lifeGroupId)
  const save = usePutLifeGroupTaskMembers(lifeGroupId)

  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(member.reason ?? "")
  const [excluded, setExcluded] = useState<number[]>(member.excluded_template_ids)

  // Keep the local draft in sync with the server after each save/refetch.
  useEffect(() => {
    setReason(member.reason ?? "")
    setExcluded(member.excluded_template_ids)
  }, [member.reason, member.excluded_template_ids])

  const badge = sourceBadge(member)
  const roleLabel = member.is_leader ? "Líder" : member.is_co_leader ? "Co-líder" : null

  const onError = (err: unknown) =>
    toast.error(getApiErrorMessage(err, "Falha ao atualizar a elegibilidade."))

  const handleToggle = (eligible: boolean) =>
    save.mutate([{ user_id: member.user_id, eligible }], { onError })

  const handleReset = () =>
    save.mutate([{ user_id: member.user_id, reset_to_automatic: true }], {
      onSuccess: () => toast.success("Elegibilidade voltou ao automático"),
      onError,
    })

  // Note: the backend stores reason/exclusions together with an explicit
  // eligibility row, so saving details pins the current eligibility as manual.
  const handleSaveDetails = () =>
    save.mutate(
      [
        {
          user_id: member.user_id,
          eligible: member.eligible,
          reason: reason.trim() ? reason : null,
          excluded_template_ids: excluded,
        },
      ],
      {
        onSuccess: () => toast.success("Detalhes salvos"),
        onError,
      }
    )

  const toggleExcluded = (templateId: number, checked: boolean) =>
    setExcluded((prev) =>
      checked ? [...new Set([...prev, templateId])] : prev.filter((id) => id !== templateId)
    )

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Switch
            checked={member.eligible}
            disabled={save.isPending}
            aria-label={`Participa do sorteio: ${member.name}`}
            onCheckedChange={handleToggle}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {member.name}
              {roleLabel && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">{roleLabel}</span>
              )}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={member.eligible ? "default" : "destructive"}>
                {member.eligible ? "Participa" : "Fora do sorteio"}
              </Badge>
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {member.excluded_template_ids.length > 0 && (
                <Badge variant="outline">
                  {member.excluded_template_ids.length} tarefa(s) excluída(s)
                </Badge>
              )}
            </div>
          </div>
          {member.eligibility_source === "manual" && (
            <Button variant="ghost" size="sm" disabled={save.isPending} onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Voltar ao automático
            </Button>
          )}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {open ? <ChevronDown className="mr-1 h-4 w-4" /> : <ChevronRight className="mr-1 h-4 w-4" />}
              Detalhes
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="space-y-4 border-t px-4 pb-4 pt-3">
            <div className="space-y-2">
              <Label>Tarefas que esta pessoa não deve receber</Label>
              {overrides.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa ativa.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {overrides.map((o) => {
                    const id = `excl-${member.user_id}-${o.template_id}`
                    return (
                      <div key={o.template_id} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={excluded.includes(o.template_id)}
                          onCheckedChange={(checked) => toggleExcluded(o.template_id, checked === true)}
                        />
                        <Label htmlFor={id} className="text-sm font-normal">
                          {o.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`reason-${member.user_id}`}>Observação (visível apenas para líderes)</Label>
              <Textarea
                id={`reason-${member.user_id}`}
                rows={2}
                maxLength={1000}
                value={reason}
                placeholder="Ex.: viaja com frequência, prefere não falar em público"
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Esta observação nunca é exibida para o membro. Salvar os detalhes fixa a
                elegibilidade atual como definição manual.
              </p>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveDetails} disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar detalhes"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
