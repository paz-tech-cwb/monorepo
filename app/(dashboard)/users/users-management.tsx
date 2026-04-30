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
import { useUsers, useCreateUser, useUpdateUser, useUpdateUserRole, useDeleteUser } from "@/lib/hooks/use-users"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import type { AdminUser, UserRole } from "@/lib/api/types"
import { WipOverlay } from "@/components/ui/wip-overlay"

const ROLE_OPTIONS: { value: UserRole; label: string; badgeVariant: "destructive" | "default" | "outline" | "secondary" }[] = [
  { value: "member",            label: "Membro",              badgeVariant: "secondary" },
  { value: "life_group_leader", label: "Lider de Life Group", badgeVariant: "outline" },
  { value: "sector_leader",     label: "Lider de Setor",      badgeVariant: "outline" },
  { value: "area_leader",       label: "Lider de Area",       badgeVariant: "outline" },
  { value: "pastor",            label: "Pastor",              badgeVariant: "default" },
  { value: "admin",             label: "Administrador",       badgeVariant: "destructive" },
]

function getRoleBadge(role: string) {
  const opt = ROLE_OPTIONS.find((o) => o.value === role)
  const variant = opt?.badgeVariant ?? "secondary"
  const label = opt?.label ?? role
  return <Badge variant={variant}>{label}</Badge>
}

export function UsersManagement() {
  const { data: users = [], isLoading, error } = useUsers()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const updateRoleMutation = useUpdateUserRole()
  const deleteMutation = useDeleteUser()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "member" as UserRole,
  })

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const resetForm = () => {
    setNewUser({ name: "", email: "", role: "member" })
  }

  const handleAddUser = async () => {
    try {
      await createMutation.mutateAsync({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      })
      toast.success("Usuario criado com sucesso!")
      resetForm()
      setIsAddDialogOpen(false)
    } catch {
      toast.error("Erro ao criar usuario. Tente novamente.")
    }
  }

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user)
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
    })
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      // If role changed, use the dedicated role endpoint
      if (newUser.role !== editingUser.role) {
        await updateRoleMutation.mutateAsync({
          id: editingUser.id,
          data: { role: newUser.role },
        })
      }

      await updateMutation.mutateAsync({
        id: editingUser.id,
        data: {
          name: newUser.name,
          email: newUser.email,
        },
      })
      toast.success("Usuario atualizado com sucesso!")
      setEditingUser(null)
      resetForm()
    } catch {
      toast.error("Erro ao atualizar usuario. Tente novamente.")
    }
  }

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteMutation.mutateAsync(userId)
      toast.success("Usuario excluido com sucesso!")
    } catch {
      toast.error("Erro ao excluir usuario. Tente novamente.")
    } finally {
      setDeletingUserId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Ativo" : "Inativo"}</Badge>
    )
  }

  const isSaving = updateMutation.isPending || updateRoleMutation.isPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
        <p className="text-muted-foreground">Gerencie os usuarios do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>{filteredUsers.length} usuario(s) encontrado(s)</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Usuario</DialogTitle>
                  <DialogDescription>Preencha os dados do novo usuario</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Funcao</Label>
                    <WipOverlay>
                      <select
                        id="role"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                        className="w-full p-2 border border-input rounded-md bg-background"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </WipOverlay>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddUser} disabled={createMutation.isPending}>
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
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : error ? (
            <p className="text-destructive text-center py-8">Erro ao carregar usuarios. Tente novamente mais tarde.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum usuario encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Funcao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[70px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{user.created_at}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingUserId(user.id)} className="text-destructive">
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

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Atualize os dados do usuario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Funcao</Label>
              <WipOverlay>
                <select
                  id="edit-role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </WipOverlay>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingUserId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingUserId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O usuario sera removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingUserId !== null) {
                  handleDeleteUser(deletingUserId)
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
