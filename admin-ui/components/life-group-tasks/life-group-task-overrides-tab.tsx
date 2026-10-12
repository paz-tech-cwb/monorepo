"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { MarkdownEditor } from "@/components/markdown-editor"
import { getApiErrorMessage } from "@/lib/api/client"
import {
  useLifeGroupTaskOverrides,
  usePutLifeGroupTaskOverrides,
} from "@/lib/hooks/use-life-group-tasks"

interface OverrideEdit {
  is_enabled: boolean
  guidance_override: string
}

export function LifeGroupTaskOverridesTab({ lifeGroupId }: { lifeGroupId: number }) {
  const { data: overrides, isLoading, error } = useLifeGroupTaskOverrides(lifeGroupId)
  const save = usePutLifeGroupTaskOverrides(lifeGroupId)

  const [edits, setEdits] = useState<Record<number, OverrideEdit>>({})
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({})

  // Re-seed local edits whenever the server data changes (initial load / save).
  useEffect(() => {
    if (!overrides) return
    const next: Record<number, OverrideEdit> = {}
    for (const o of overrides) {
      next[o.template_id] = {
        is_enabled: o.is_enabled,
        guidance_override: o.guidance_override ?? "",
      }
    }
    setEdits(next)
  }, [overrides])

  const patch = (templateId: number, change: Partial<OverrideEdit>) =>
    setEdits((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], ...change },
    }))

  const handleSave = () => {
    if (!overrides) return
    save.mutate(
      overrides.map((o) => {
        const edit = edits[o.template_id]
        return {
          template_id: o.template_id,
          is_enabled: edit?.is_enabled ?? o.is_enabled,
          guidance_override: edit?.guidance_override.trim() ? edit.guidance_override : null,
        }
      }),
      {
        onSuccess: () => toast.success("Tarefas do grupo atualizadas"),
        onError: (err) => toast.error(getApiErrorMessage(err, "Falha ao salvar as tarefas do grupo.")),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getApiErrorMessage(error, "Erro ao carregar as tarefas do grupo.")}
      </p>
    )
  }

  if (!overrides || overrides.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma tarefa ativa cadastrada. Peça a um administrador para criar tarefas em
        &quot;Tarefas do Life&quot;.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Desative as tarefas que este grupo não usa e, se quiser, personalize o guia. As alterações
        valem para os próximos sorteios; tarefas já sorteadas não mudam.
      </p>

      {overrides.map((override) => {
        const edit = edits[override.template_id] ?? {
          is_enabled: override.is_enabled,
          guidance_override: override.guidance_override ?? "",
        }
        const hasCustomGuidance = edit.guidance_override.trim().length > 0
        const isOpen = !!openIds[override.template_id]
        return (
          <Collapsible
            key={override.template_id}
            open={isOpen}
            onOpenChange={(open) => setOpenIds((prev) => ({ ...prev, [override.template_id]: open }))}
          >
            <div className="rounded-lg border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <Switch
                  checked={edit.is_enabled}
                  aria-label={`Usar a tarefa ${override.name}`}
                  onCheckedChange={(checked) => patch(override.template_id, { is_enabled: checked })}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{override.name}</p>
                  {override.description && (
                    <p className="text-xs text-muted-foreground truncate">{override.description}</p>
                  )}
                </div>
                {hasCustomGuidance && <Badge variant="secondary">Guia personalizado</Badge>}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isOpen ? (
                      <ChevronDown className="mr-1 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-1 h-4 w-4" />
                    )}
                    Guia
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="space-y-3 border-t px-4 pb-4 pt-3">
                  <p className="text-xs text-muted-foreground">
                    {hasCustomGuidance
                      ? "Este grupo usa um guia próprio no lugar do guia padrão."
                      : "Em branco: o guia padrão da tarefa é usado."}
                  </p>
                  <MarkdownEditor
                    value={edit.guidance_override}
                    onChange={(value) => patch(override.template_id, { guidance_override: value })}
                    placeholder={
                      override.template_guidance
                        ? "Escreva um guia próprio para este grupo (Markdown)..."
                        : "Guia da tarefa (Markdown)..."
                    }
                  />
                  {hasCustomGuidance && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => patch(override.template_id, { guidance_override: "" })}
                    >
                      Usar guia padrão
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  )
}
