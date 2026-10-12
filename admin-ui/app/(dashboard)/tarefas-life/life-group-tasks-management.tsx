"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import {
  ArrowDown,
  ArrowUp,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { ApiError, getApiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  useLifeGroupTaskTemplates,
  useUpdateLifeGroupTaskTemplate,
  useDeleteLifeGroupTaskTemplate,
  useReorderLifeGroupTaskTemplates,
} from "@/lib/hooks/use-life-group-tasks"
import type { LifeGroupTaskTemplate } from "@/lib/api/types"
import { LifeGroupTaskTemplateForm } from "./life-group-task-template-form"

export function LifeGroupTasksManagement() {
  const { user } = useAuth()
  // Templates are admin-only on the backend (GET included); the sidebar entry
  // is hidden for other roles, this guards direct URL access.
  const isAdmin = user?.role === "admin"

  const { data, isLoading, error } = useLifeGroupTaskTemplates(isAdmin)
  const updateMutation = useUpdateLifeGroupTaskTemplate()
  const deleteMutation = useDeleteLifeGroupTaskTemplate()
  const reorderMutation = useReorderLifeGroupTaskTemplates()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LifeGroupTaskTemplate | null>(null)
  const [deleting, setDeleting] = useState<LifeGroupTaskTemplate | null>(null)

  const templates = data ?? []

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (template: LifeGroupTaskTemplate) => {
    setEditing(template)
    setFormOpen(true)
  }

  const handleToggleActive = (template: LifeGroupTaskTemplate, isActive: boolean) => {
    updateMutation.mutate(
      { id: template.id, data: { is_active: isActive } },
      { onError: (err) => toast.error(getApiErrorMessage(err, "Falha ao atualizar a tarefa.")) }
    )
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= templates.length) return
    const ids = templates.map((t) => t.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(target, 0, moved)
    reorderMutation.mutate(ids, {
      onError: (err) => toast.error(getApiErrorMessage(err, "Falha ao reordenar as tarefas.")),
    })
  }

  const handleDelete = async (template: LifeGroupTaskTemplate) => {
    try {
      await deleteMutation.mutateAsync(template.id)
      setDeleting(null)
      toast.success("Tarefa excluída")
    } catch (err) {
      setDeleting(null)
      if (err instanceof ApiError && err.status === 409) {
        // Template already used by assignments — history keeps the FK.
        toast.error(
          "Esta tarefa já foi sorteada em algum encontro e não pode ser excluída. Desative-a para que deixe de ser sorteada."
        )
        return
      }
      toast.error(getApiErrorMessage(err, "Falha ao excluir a tarefa."))
    }
  }

  if (user && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">
          Você não tem permissão para gerenciar as tarefas dos Life Groups.
        </p>
      </div>
    )
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Erro ao carregar as tarefas. Tente novamente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tarefas do Life</h1>
        <p className="text-muted-foreground">
          Tarefas sorteadas entre os membros a cada encontro de Life Group
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Tarefas</CardTitle>
              <CardDescription>{templates.length} tarefa(s) cadastrada(s)</CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Ordem</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma tarefa cadastrada ainda
                  </TableCell>
                </TableRow>
              )}
              {templates.map((template, index) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Mover para cima"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => handleMove(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Mover para baixo"
                        disabled={index === templates.length - 1 || reorderMutation.isPending}
                        onClick={() => handleMove(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{template.name}</p>
                  </TableCell>
                  <TableCell className="max-w-[360px]">
                    <p className="truncate text-muted-foreground">
                      {template.description || "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.is_active}
                        aria-label={template.is_active ? "Desativar tarefa" : "Ativar tarefa"}
                        disabled={updateMutation.isPending}
                        onCheckedChange={(checked) => handleToggleActive(template, checked)}
                      />
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTimeout(() => openEdit(template), 0)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTimeout(() => setDeleting(template), 0)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LifeGroupTaskTemplateForm open={formOpen} onOpenChange={setFormOpen} template={editing} />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        entityName={deleting ? `a tarefa "${deleting.name}"` : "esta tarefa"}
        onConfirm={() => {
          if (deleting) handleDelete(deleting)
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
