"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from "@/lib/hooks/use-members"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import type { Member } from "@/lib/api/types"

export function MembersManagement() {
  const { data: members = [], isLoading, error } = useMembers()
  const createMutation = useCreateMember()
  const updateMutation = useUpdateMember()
  const deleteMutation = useDeleteMember()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    birth_date: "",
    life_group: "",
  })

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.life_group || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", address: "", birth_date: "", life_group: "" })
  }

  const handleAdd = async () => {
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        birth_date: formData.birth_date || undefined,
        life_group: formData.life_group || undefined,
      })
      toast.success("Membro adicionado com sucesso!")
      resetForm()
      setIsAddDialogOpen(false)
    } catch {
      toast.error("Erro ao adicionar membro. Tente novamente.")
    }
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      address: member.address || "",
      birth_date: member.birth_date || "",
      life_group: member.life_group || "",
    })
  }

  const handleUpdate = async () => {
    if (!editingMember) return

    try {
      await updateMutation.mutateAsync({
        id: editingMember.id,
        data: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          birth_date: formData.birth_date || undefined,
          life_group: formData.life_group || undefined,
        },
      })
      toast.success("Membro atualizado com sucesso!")
      setEditingMember(null)
      resetForm()
    } catch {
      toast.error("Erro ao atualizar membro. Tente novamente.")
    }
  }

  const handleDelete = async (memberId: number) => {
    try {
      await deleteMutation.mutateAsync(memberId)
      toast.success("Membro excluido com sucesso!")
    } catch {
      toast.error("Erro ao excluir membro. Tente novamente.")
    } finally {
      setDeletingMemberId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>
        {status === "active" ? "Ativo" : "Inativo"}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Membros</h1>
        <p className="text-muted-foreground">Gerencie os membros da igreja</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Membros</CardTitle>
              <CardDescription>{filteredMembers.length} membro(s) encontrado(s)</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Membro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Membro</DialogTitle>
                  <DialogDescription>Preencha os dados do novo membro</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="life_group">Life Group</Label>
                    <Input
                      id="life_group"
                      value={formData.life_group}
                      onChange={(e) => setFormData({ ...formData, life_group: e.target.value })}
                      placeholder="Nome do Life Group"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="address">Endereco</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Endereco completo"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAdd} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adicionando..." : "Adicionar"}
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
              placeholder="Buscar membros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : error ? (
            <p className="text-destructive text-center py-8">Erro ao carregar membros. Tente novamente mais tarde.</p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum membro encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Life Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.phone || "-"}</TableCell>
                    <TableCell>{member.life_group || "-"}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(member)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingMemberId(member.id)} className="text-destructive">
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
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>Atualize os dados do membro</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="edit-birth_date">Data de Nascimento</Label>
              <Input
                id="edit-birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-life_group">Life Group</Label>
              <Input
                id="edit-life_group"
                value={formData.life_group}
                onChange={(e) => setFormData({ ...formData, life_group: e.target.value })}
                placeholder="Nome do Life Group"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-address">Endereco</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Endereco completo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingMemberId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingMemberId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O membro sera removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingMemberId !== null) {
                  handleDelete(deletingMemberId)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
