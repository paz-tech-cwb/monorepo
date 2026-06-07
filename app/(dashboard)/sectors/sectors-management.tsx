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
  useSectors,
  useCreateSector,
  useUpdateSector,
  useDeleteSector,
} from "@/lib/hooks/use-sectors"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import type { Sector } from "@/lib/api/types"
import { format } from "date-fns"

export function SectorsManagement() {
  const { data: sectors = [], isLoading, error } = useSectors()
  const createMutation = useCreateSector()
  const updateMutation = useUpdateSector()
  const deleteMutation = useDeleteSector()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSector, setEditingSector] = useState<Sector | null>(null)
  const [deletingSectorId, setDeletingSectorId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: "" })

  const filteredSectors = sectors.filter((sector) =>
    sector.name.toLowerCase().includes(searchTerm.toLowerCase())
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
      toast.success("Setor criado com sucesso!")
      resetForm()
      setIsAddDialogOpen(false)
    } catch {
      toast.error("Erro ao criar setor. Tente novamente.")
    }
  }

  const handleEdit = (sector: Sector) => {
    setEditingSector(sector)
    setFormData({ name: sector.name })
  }

  const handleUpdate = async () => {
    if (!editingSector) return

    if (!formData.name.trim()) {
      toast.error("Nome e obrigatorio")
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingSector.id,
        data: { name: formData.name },
      })
      toast.success("Setor atualizado com sucesso!")
      setEditingSector(null)
      resetForm()
    } catch {
      toast.error("Erro ao atualizar setor. Tente novamente.")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Setor excluido com sucesso!")
    } catch {
      toast.error("Erro ao excluir setor. Tente novamente.")
    } finally {
      setDeletingSectorId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Setores</h1>
        <p className="text-muted-foreground">Gerencie os setores da igreja</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Setores</CardTitle>
              <CardDescription>
                {filteredSectors.length} setor(es) encontrado(s)
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Novo Setor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Setor</DialogTitle>
                  <DialogDescription>
                    Preencha o nome do novo setor
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
                      placeholder="Nome do setor"
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
              placeholder="Buscar setores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={3} />
          ) : error ? (
            <p className="text-destructive text-center py-8">
              Erro ao carregar setores. Tente novamente mais tarde.
            </p>
          ) : filteredSectors.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum setor encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[70px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSectors.map((sector) => (
                  <TableRow key={sector.id}>
                    <TableCell className="font-medium">{sector.id}</TableCell>
                    <TableCell>{sector.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {sector.area_id != null ? `Área ${sector.area_id}` : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(sector.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sector)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingSectorId(sector.id)}
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
      <Dialog
        open={!!editingSector}
        onOpenChange={() => setEditingSector(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Setor</DialogTitle>
            <DialogDescription>Atualize o nome do setor</DialogDescription>
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
                placeholder="Nome do setor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSector(null)}>
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
        open={deletingSectorId !== null}
        onOpenChange={(open) => { if (!open) setDeletingSectorId(null) }}
        entityName="este setor"
        onConfirm={() => { if (deletingSectorId !== null) handleDelete(deletingSectorId) }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
