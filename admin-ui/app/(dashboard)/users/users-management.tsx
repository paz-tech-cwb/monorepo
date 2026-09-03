"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Search, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { useUsers, useCreateUser, useUpdateUser, useUpdateUserRole, useDeleteUser } from "@/lib/hooks/use-users"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import type { AdminUser, UserRole } from "@/lib/api/types"
import { useAuthContext } from "@/contexts/auth-context"

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
  const { user: currentUser } = useAuthContext()
  const isAdmin = currentUser?.role === "admin"
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

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground">Gerencie os usuarios do sistema</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              Acesso restrito. Apenas administradores podem gerenciar contas de usuario.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Usuario
            </Button>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => setTimeout(() => handleEditUser(user), 0)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTimeout(() => setDeletingUserId(user.id), 0)} className="text-destructive">
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

      {/* Add User Drawer */}
      <FormDrawer
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Adicionar Novo Usuario"
        description="Preencha os dados do novo usuario"
        isLoading={createMutation.isPending}
        onSubmit={handleAddUser}
        submitLabel="Adicionar"
      >
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Nome</Label>
            <Input
              id="user-name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-email">E-mail</Label>
            <Input
              id="user-email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="user-role">Funcao</Label>
            <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as UserRole })}>
              <SelectTrigger id="user-role">
                <SelectValue placeholder="Selecione uma funcao" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDrawer>

      {/* Edit User Drawer */}
      <FormDrawer
        open={!!editingUser}
        onOpenChange={(open) => { if (!open) { setEditingUser(null); resetForm() } }}
        title="Editar Usuario"
        description="Atualize os dados do usuario"
        isLoading={isSaving}
        onSubmit={handleUpdateUser}
        submitLabel="Salvar"
      >
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">E-mail</Label>
            <Input
              id="edit-email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Funcao</Label>
            <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as UserRole })}>
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="Selecione uma funcao" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDrawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deletingUserId !== null}
        onOpenChange={(open) => { if (!open) setDeletingUserId(null) }}
        entityName="este usuario"
        onConfirm={() => { if (deletingUserId !== null) handleDeleteUser(deletingUserId) }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
