"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import {
  useAreas,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
} from "@/lib/hooks/use-areas"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import type { Area } from "@/lib/api/types"
import { format } from "date-fns"

export function AreasManagement() {
  const { data: areas = [], isLoading, error } = useAreas()
  const createMutation = useCreateArea()
  const updateMutation = useUpdateArea()
  const deleteMutation = useDeleteArea()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [deletingAreaId, setDeletingAreaId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: "" })

  const filteredAreas = areas.filter((area) =>
    area.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({ name: "" })
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome e obrigatorio")
      return
    }

    try {
      await createMutation.mutateAsync({ name: formData.name })
      toast.success("Area criada com sucesso!")
      resetForm()
      setIsAddDialogOpen(false)
    } catch {
      toast.error("Erro ao criar area. Tente novamente.")
    }
  }

  const handleEdit = (area: Area) => {
    setEditingArea(area)
    setFormData({ name: area.name })
  }

  const handleUpdate = async () => {
    if (!editingArea) return

    if (!formData.name.trim()) {
      toast.error("Nome e obrigatorio")
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingArea.id,
        data: { name: formData.name },
      })
      toast.success("Area atualizada com sucesso!")
      setEditingArea(null)
      resetForm()
    } catch {
      toast.error("Erro ao atualizar area. Tente novamente.")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Area excluida com sucesso!")
    } catch {
      toast.error("Erro ao excluir area. Tente novamente.")
    } finally {
      setDeletingAreaId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Areas</h1>
        <p className="text-muted-foreground">Gerencie as areas da igreja</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Areas</CardTitle>
              <CardDescription>
                {filteredAreas.length} area(s) encontrada(s)
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Nova Area
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Area</DialogTitle>
                  <DialogDescription>
                    Preencha o nome da nova area
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Nome da area"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Criando..." : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar areas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={3} />
          ) : error ? (
            <p className="text-destructive text-center py-8">
              Erro ao carregar areas. Tente novamente mais tarde.
            </p>
          ) : filteredAreas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma area encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[70px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAreas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium"><Badge variant="outline">#{area.id}</Badge></TableCell>
                    <TableCell>{area.name}</TableCell>
                    <TableCell>
                      {format(new Date(area.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(area)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingAreaId(area.id)}
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
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingArea} onOpenChange={() => setEditingArea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Area</DialogTitle>
            <DialogDescription>Atualize o nome da area</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Nome da area"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArea(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deletingAreaId !== null}
        onOpenChange={(open) => { if (!open) setDeletingAreaId(null) }}
        entityName="esta área"
        onConfirm={() => { if (deletingAreaId !== null) handleDelete(deletingAreaId) }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
