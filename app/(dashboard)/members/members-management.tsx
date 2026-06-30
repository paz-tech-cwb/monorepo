"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import { DateInput } from "@/components/ui/date-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Search, Plus, MoreHorizontal, Edit, Trash2, GitMerge } from "lucide-react"
import { useUsers, useCreateUser, useUpdateUser, useUpdateUserRole, useDeleteUser } from "@/lib/hooks/use-users"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import { JourneySheet } from "./journey-sheet"
import type { AdminUser, UserRole } from "@/lib/api/types"
import { WipOverlay } from "@/components/ui/wip-overlay"

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "member", label: "Membro" },
  { value: "life_group_leader", label: "Lider de Life Group" },
  { value: "sector_leader", label: "Lider de Setor" },
  { value: "area_leader", label: "Lider de Area" },
  { value: "pastor", label: "Pastor" },
  { value: "admin", label: "Administrador" },
]

function getRoleLabel(role: string): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role
}

type RoleTab = "all" | "life_group_leader" | "member"

export function MembersManagement() {
  const { data: members = [], isLoading, error } = useUsers()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const updateRoleMutation = useUpdateUserRole()
  const deleteMutation = useDeleteUser()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<AdminUser | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null)
  const [journeyMember, setJourneyMember] = useState<AdminUser | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    address: "",
    birth_date: "",
    role: "member" as UserRole,
  })

  // New filter/bulk-select state
  const [roleTab, setRoleTab] = useState<RoleTab>("all")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sectorFilter, setSectorFilter] = useState("")

  const filteredMembers = members.filter(
    (member) =>
      (member.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const displayedMembers = filteredMembers.filter(
    (m) => roleTab === "all" || m.role === roleTab,
  )

  const resetForm = () => {
    setFormData({ name: "", email: "", phone_number: "", address: "", birth_date: "", role: "member" })
  }

  const handleAdd = async () => {
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number || undefined,
        address: formData.address || undefined,
        birth_date: formData.birth_date || undefined,
        role: formData.role,
      })
      toast.success("Membro adicionado com sucesso!")
      resetForm()
      setIsAddDrawerOpen(false)
    } catch {
      toast.error("Erro ao adicionar membro. Tente novamente.")
    }
  }

  const handleEdit = (member: AdminUser) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      phone_number: member.phone_number || member.phone || "",
      address: member.address || "",
      birth_date: member.birth_date || "",
      role: member.role,
    })
  }

  const handleUpdate = async () => {
    if (!editingMember) return

    try {
      // If role changed, fire the dedicated role endpoint
      if (formData.role !== editingMember.role) {
        await updateRoleMutation.mutateAsync({
          id: editingMember.id,
          data: { role: formData.role },
        })
      }

      await updateMutation.mutateAsync({
        id: editingMember.id,
        data: {
          name: formData.name,
          email: formData.email,
          phone_number: formData.phone_number || undefined,
          address: formData.address || undefined,
          birth_date: formData.birth_date || undefined,
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

  const isSaving = updateMutation.isPending || updateRoleMutation.isPending

  const memberFormFields = (
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
        <Label htmlFor="phone_number">Telefone</Label>
        <PhoneInput
          id="phone_number"
          value={formData.phone_number}
          onChange={(v) => setFormData({ ...formData, phone_number: v })}
        />
      </div>
      <div>
        <Label htmlFor="birth_date">Data de Nascimento</Label>
        <DateInput
          id="birth_date"
          value={formData.birth_date}
          onChange={(v) => setFormData({ ...formData, birth_date: v })}
        />
      </div>
      <div>
        <Label htmlFor="role">Funcao</Label>
        <WipOverlay>
          <Select
            value={formData.role}
            onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
          >
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </WipOverlay>
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
  )

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
              <CardDescription>{displayedMembers.length} membro(s) encontrado(s)</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setIsAddDrawerOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Advanced Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">Filtros avançados</Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Setor</Label>
                <Input
                  placeholder="Filtrar por setor"
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : error ? (
            <p className="text-destructive text-center py-8">Erro ao carregar membros. Tente novamente mais tarde.</p>
          ) : (
            <Tabs value={roleTab} onValueChange={(v) => setRoleTab(v as RoleTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="life_group_leader">Líderes</TabsTrigger>
                <TabsTrigger value="member">Membros</TabsTrigger>
              </TabsList>
              <TabsContent value={roleTab}>
                {displayedMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum membro encontrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              displayedMembers.length > 0 &&
                              displayedMembers.every((m) => selectedIds.includes(m.id))
                            }
                            onCheckedChange={(checked) =>
                              setSelectedIds(checked ? displayedMembers.map((m) => m.id) : [])
                            }
                          />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Life Group</TableHead>
                        <TableHead>Funcao</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[70px]">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(member.id)}
                              onCheckedChange={(checked) =>
                                setSelectedIds((prev) =>
                                  checked
                                    ? [...prev, member.id]
                                    : prev.filter((id) => id !== member.id),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.phone_number || member.phone || "-"}</TableCell>
                          <TableCell>{member.life_groups.map((g) => g.name).join(", ") || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(member.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setTimeout(() => handleEdit(member), 0)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeout(() => setJourneyMember(member), 0)}>
                                  <GitMerge className="mr-2 h-4 w-4" />
                                  Ver Jornada
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setTimeout(() => setDeletingMemberId(member.id), 0)}
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
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Add Member Drawer */}
      <FormDrawer
        open={isAddDrawerOpen}
        onOpenChange={(open) => {
          if (!open) { resetForm(); setIsAddDrawerOpen(false) }
        }}
        title="Adicionar Novo Membro"
        description="Preencha os dados do novo membro"
        onSubmit={handleAdd}
        isLoading={createMutation.isPending}
        submitLabel="Adicionar"
      >
        {memberFormFields}
      </FormDrawer>

      {/* Edit Member Drawer */}
      <FormDrawer
        open={!!editingMember}
        onOpenChange={(open) => {
          if (!open) { setEditingMember(null); resetForm() }
        }}
        title="Editar Membro"
        description="Atualize os dados do membro"
        onSubmit={handleUpdate}
        isLoading={isSaving}
        submitLabel="Salvar"
      >
        {memberFormFields}
      </FormDrawer>

      {/* Journey Sheet */}
      <JourneySheet
        member={journeyMember}
        open={journeyMember !== null}
        onOpenChange={(open) => { if (!open) setJourneyMember(null) }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deletingMemberId !== null}
        onOpenChange={(open) => { if (!open) setDeletingMemberId(null) }}
        entityName="este membro"
        onConfirm={() => { if (deletingMemberId !== null) handleDelete(deletingMemberId) }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
