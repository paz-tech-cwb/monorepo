"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MarkdownEditor } from "@/components/markdown-editor"
import { getApiErrorMessage } from "@/lib/api/client"
import {
  useCreateLifeGroupTaskTemplate,
  useUpdateLifeGroupTaskTemplate,
} from "@/lib/hooks/use-life-group-tasks"
import type { LifeGroupTaskTemplate } from "@/lib/api/types"

interface TemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // null = create a new template
  template: LifeGroupTaskTemplate | null
}

export function LifeGroupTaskTemplateForm({ open, onOpenChange, template }: TemplateFormProps) {
  const createMutation = useCreateLifeGroupTaskTemplate()
  const updateMutation = useUpdateLifeGroupTaskTemplate()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [guidance, setGuidance] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [nameError, setNameError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens for a (different) template.
  useEffect(() => {
    if (!open) return
    setName(template?.name ?? "")
    setDescription(template?.description ?? "")
    setGuidance(template?.guidance ?? "")
    setIsActive(template?.is_active ?? true)
    setNameError(null)
  }, [open, template])

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Obrigatório")
      return
    }
    const payload = {
      name: name.trim(),
      description,
      guidance,
      is_active: isActive,
    }
    try {
      if (template) {
        await updateMutation.mutateAsync({ id: template.id, data: payload })
        toast.success("Tarefa atualizada")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("Tarefa criada")
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          template ? "Falha ao atualizar a tarefa." : "Falha ao criar a tarefa."
        )
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>
            O nome, a descrição e o guia aparecem para o membro sorteado no aplicativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-name">Nome *</Label>
            <Input
              id="task-name"
              value={name}
              maxLength={150}
              placeholder="Ex.: Palavra, Louvor, Oferta"
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError(null)
              }}
            />
            {nameError && <p className="text-sm text-destructive mt-1">{nameError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              value={description}
              rows={3}
              maxLength={5000}
              placeholder="Resumo curto do que a pessoa precisa fazer"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 flex flex-col">
            <Label>Guia (Markdown)</Label>
            <MarkdownEditor
              value={guidance}
              onChange={setGuidance}
              placeholder="Passo a passo para quem for responsável pela tarefa..."
            />
            <p className="text-xs text-muted-foreground">
              Use a aba &quot;Visualizar&quot; para ver como o guia será exibido. Cada Life Group
              pode substituir este guia no seu próprio painel de tarefas.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <Label htmlFor="task-active">Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Tarefas inativas não entram nos próximos sorteios.
              </p>
            </div>
            <Switch id="task-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
