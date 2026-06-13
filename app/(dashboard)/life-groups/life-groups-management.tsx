"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import {
  Search,
  MoreHorizontal,
  Users2,
  User,
  BarChart3,
  UserPlus,
  UserMinus,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import {
  useLifeGroups,
  useCreateLifeGroup,
  useUpdateLifeGroup,
  useDeleteLifeGroup,
  useAddLifeGroupMember,
  useRemoveLifeGroupMember,
} from "@/lib/hooks/use-life-groups"
import { useUsers } from "@/lib/hooks/use-users"
import { useSectors } from "@/lib/hooks/use-sectors"
import type { LifeGroup, CreateLifeGroupRequest } from "@/lib/api/types"
import type { AdminUser } from "@/lib/api/types"
import { WipOverlay } from "@/components/ui/wip-overlay"
import { LeaderPairPicker } from "@/components/ministries/leader-pair-picker"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEETING_DAYS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
  "Sem dia fixo",
] as const

// ---------------------------------------------------------------------------
// LifeGroup form — used for both Create and Edit
// ---------------------------------------------------------------------------

interface LifeGroupFormData {
  name: string
  location: string
  meeting_day: string
  meeting_time: string
  leader_id: string   // string for select value; converted to number on submit
  co_leader_id: string   // string for select value; converted to number on submit
  sector_id: string
}

const EMPTY_FORM: LifeGroupFormData = {
  name: "",
  location: "",
  meeting_day: "",
  meeting_time: "",
  leader_id: "",
  co_leader_id: "",
  sector_id: "",
}

function groupToForm(g: LifeGroup): LifeGroupFormData {
  return {
    name: g.name,
    location: g.location ?? "",
    meeting_day: g.meeting_day ?? "",
    meeting_time: g.meeting_time ?? "",
    leader_id: g.leader_id != null ? String(g.leader_id) : "",
    co_leader_id: g.co_leader_id != null ? String(g.co_leader_id) : "",
    sector_id: g.sector_id != null ? String(g.sector_id) : "",
  }
}

function formToRequest(f: LifeGroupFormData): CreateLifeGroupRequest {
  return {
    name: f.name.trim(),
    location: f.location.trim() || null,
    meeting_day: f.meeting_day || null,
    meeting_time: f.meeting_time || null,
    leader_id: f.leader_id ? Number(f.leader_id) : null,
    co_leader_id: f.co_leader_id ? Number(f.co_leader_id) : null,
    sector_id: f.sector_id ? Number(f.sector_id) : null,
  }
}

// ---------------------------------------------------------------------------
// MemberItem sub-component
// ---------------------------------------------------------------------------

interface MemberItemProps {
  member: AdminUser
  isCurrentMember: boolean
  onAdd: (member: AdminUser) => void
  onRemove: (member: AdminUser) => void
  isPending: boolean
}

const MemberItem = ({ member, isCurrentMember, onAdd, onRemove, isPending }: MemberItemProps) => (
  <div
    className={`flex items-center justify-between p-3 rounded-lg border ${
      isCurrentMember ? "border-primary bg-primary/5" : "border-border"
    }`}
  >
    <div className="flex-1">
      <p className="text-sm font-medium">{member.name}</p>
      <p className="text-xs text-muted-foreground">{member.email}</p>
    </div>
    {isCurrentMember ? (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => onRemove(member)}
        className="text-destructive hover:text-destructive"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserMinus className="h-4 w-4 mr-1" />Remover</>}
      </Button>
    ) : (
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => onAdd(member)}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1" />Adicionar</>}
      </Button>
    )}
  </div>
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LifeGroupsManagement() {
  const { data: lifeGroups = [], isLoading } = useLifeGroups()
  const { data: allUsers = [] } = useUsers()
  const { data: sectors = [] } = useSectors()

  const createLifeGroup = useCreateLifeGroup()
  const updateLifeGroup = useUpdateLifeGroup()
  const deleteLifeGroup = useDeleteLifeGroup()
  const addMember = useAddLifeGroupMember()
  const removeMember = useRemoveLifeGroupMember()

  // Group list state
  const [searchTerm, setSearchTerm] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sectorFilter, setSectorFilter] = useState("")

  // Create / Edit drawer state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<LifeGroup | null>(null)
  const [form, setForm] = useState<LifeGroupFormData>(EMPTY_FORM)

  // Members dialog state
  const [managingGroupId, setManagingGroupId] = useState<number | null>(null)
  const managingGroup = managingGroupId != null
    ? lifeGroups.find((g) => g.id === managingGroupId) ?? null
    : null
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [memberSearchTerm, setMemberSearchTerm] = useState("")
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null)

  // Delete confirmation state
  const [deletingGroup, setDeletingGroup] = useState<LifeGroup | null>(null)

  // ----- derived stats -------------------------------------------------------

  const totalGroups = lifeGroups.length
  const totalMembers = allUsers.length
  const membersInAGroup = allUsers.filter((u) => u.life_group_ids?.length > 0).length
  const avgPerGroup = totalGroups > 0
    ? Math.round(lifeGroups.reduce((s, g) => s + g.member_count, 0) / totalGroups)
    : 0

  // Sector lookup map
  const sectorMap = useMemo(
    () => new Map(sectors.map((s) => [s.id, s.name])),
    [sectors]
  )

  const filteredGroups = lifeGroups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSector = sectorFilter
      ? (g.sector_id != null && sectorMap.get(g.sector_id)?.toLowerCase().includes(sectorFilter.toLowerCase()))
      : true
    return matchesSearch && matchesSector
  })

  // ----- members dialog ------------------------------------------------------

  const currentGroupMemberIds = useMemo(
    () => new Set(managingGroup?.members.map((m) => m.id) ?? []),
    [managingGroup]
  )

  const filteredUsers = useMemo(
    () => allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
    ),
    [allUsers, memberSearchTerm]
  )

  const currentGroupMembers = filteredUsers.filter((u) => currentGroupMemberIds.has(u.id))
  const nonGroupMembers = filteredUsers.filter((u) => !currentGroupMemberIds.has(u.id))

  // ----- handlers ------------------------------------------------------------

  function openCreate() {
    setEditingGroup(null)
    setForm(EMPTY_FORM)
    setIsFormOpen(true)
  }

  function openEdit(group: LifeGroup) {
    setEditingGroup(group)
    setForm(groupToForm(group))
    setIsFormOpen(true)
  }

  function handleFormSubmit() {
    if (!form.name.trim()) return
    const request = formToRequest(form)

    if (editingGroup) {
      updateLifeGroup.mutate(
        { id: editingGroup.id, data: request },
        {
          onSuccess: () => {
            toast.success("Grupo atualizado")
            setIsFormOpen(false)
          },
          onError: () => toast.error("Erro ao atualizar grupo"),
        }
      )
    } else {
      createLifeGroup.mutate(request, {
        onSuccess: (newGroup) => {
          toast.success("Grupo criado")
          setIsFormOpen(false)
          // Immediately open member management for the new group
          setManagingGroupId(newGroup.id)
          setMemberSearchTerm("")
          setIsMembersDialogOpen(true)
        },
        onError: () => toast.error("Erro ao criar grupo"),
      })
    }
  }

  function handleDelete(group: LifeGroup) {
    deleteLifeGroup.mutate(group.id, {
      onSuccess: () => {
        toast.success(`"${group.name}" excluído`)
        setDeletingGroup(null)
      },
      onError: () => {
        toast.error("Erro ao excluir grupo")
        setDeletingGroup(null)
      },
    })
  }

  function handleManageMembers(group: LifeGroup) {
    setManagingGroupId(group.id)
    setMemberSearchTerm("")
    setIsMembersDialogOpen(true)
  }

  function handleAddMember(member: AdminUser) {
    if (!managingGroup) return
    setPendingMemberId(member.id)
    addMember.mutate(
      { lifeGroupId: managingGroup.id, userId: member.id },
      {
        onSuccess: () => {
          toast.success(`${member.name} adicionado ao grupo`)
          setPendingMemberId(null)
        },
        onError: () => {
          toast.error("Erro ao adicionar membro")
          setPendingMemberId(null)
        },
      }
    )
  }

  function handleRemoveMember(member: AdminUser) {
    if (!managingGroup) return
    setPendingMemberId(member.id)
    removeMember.mutate(
      { lifeGroupId: managingGroup.id, userId: member.id },
      {
        onSuccess: () => {
          toast.success(`${member.name} removido do grupo`)
          setPendingMemberId(null)
        },
        onError: () => {
          toast.error("Erro ao remover membro")
          setPendingMemberId(null)
        },
      }
    )
  }

  const isFormPending = createLifeGroup.isPending || updateLifeGroup.isPending

  // ----- loading state -------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Life Groups</h1>
        <p className="text-muted-foreground">Gerencie os grupos de vida da igreja</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGroups}</div>
            <p className="text-xs text-muted-foreground">grupos ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros em Grupos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{membersInAGroup}</div>
            <p className="text-xs text-muted-foreground">de {totalMembers} membros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Grupo</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerGroup}</div>
            <p className="text-xs text-muted-foreground">membros por grupo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Grupo</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers - membersInAGroup}</div>
            <p className="text-xs text-muted-foreground">membros não alocados</p>
          </CardContent>
        </Card>
      </div>

      {/* Groups table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Life Groups</CardTitle>
              <CardDescription>{filteredGroups.length} grupo(s) encontrado(s)</CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros avançados
                </Button>
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
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm || sectorFilter
                ? `Nenhum grupo encontrado para os filtros aplicados`
                : "Nenhum grupo cadastrado. Crie o primeiro grupo clicando em \"Novo Grupo\"."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Reunião</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead className="w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.location ?? ""}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(group.leader_name ?? "G").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{group.leader_name ?? "—"}{group.co_leader_name ? ` & ${group.co_leader_name}` : ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {group.sector_id != null ? (sectorMap.get(group.sector_id) ?? "—") : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {group.meeting_day || group.meeting_time ? (
                        <div className="text-sm">
                          {group.meeting_day && <p>{group.meeting_day}</p>}
                          {group.meeting_time && (
                            <p className="text-muted-foreground">{group.meeting_time}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{group.member_count} membro(s)</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {group.members.slice(0, 3).map((m) => m.name).join(", ")}
                        {group.member_count > 3 && ` +${group.member_count - 3} outros`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleManageMembers(group)}>
                            <Users2 className="mr-2 h-4 w-4" />
                            Gerenciar Membros
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(group)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingGroup(group)}
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

      {/* Create / Edit FormDrawer */}
      <FormDrawer
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingGroup(null)
        }}
        title={editingGroup ? "Editar Life Group" : "Novo Life Group"}
        description={
          editingGroup
            ? "Atualize os dados do grupo."
            : "Preencha os dados do novo grupo. Você poderá adicionar membros em seguida."
        }
        isLoading={isFormPending}
        onSubmit={handleFormSubmit}
        submitLabel={editingGroup ? "Salvar" : "Criar e Adicionar Membros"}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="lg-name">Nome *</Label>
            <Input
              id="lg-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Grupo da Quarta"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="lg-location">Local</Label>
            <Input
              id="lg-location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Ex: Rua das Flores, 123"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Dia da Reunião</Label>
              <WipOverlay>
                <Select
                  value={form.meeting_day}
                  onValueChange={(v) => setForm((f) => ({ ...f, meeting_day: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_DAYS.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </WipOverlay>
            </div>

            <div className="space-y-1">
              <Label htmlFor="lg-time">Horário</Label>
              <Input
                id="lg-time"
                type="time"
                value={form.meeting_time}
                onChange={(e) => setForm((f) => ({ ...f, meeting_time: e.target.value }))}
              />
            </div>
          </div>

          <LeaderPairPicker
            users={allUsers}
            leaderId={form.leader_id ? Number(form.leader_id) : null}
            coLeaderId={form.co_leader_id ? Number(form.co_leader_id) : null}
            onLeaderChange={(id) => setForm((f) => ({ ...f, leader_id: id != null ? String(id) : "" }))}
            onCoLeaderChange={(id) => setForm((f) => ({ ...f, co_leader_id: id != null ? String(id) : "" }))}
          />

          <div className="space-y-1">
            <Label>Setor</Label>
            <Select
              value={form.sector_id}
              onValueChange={(v) => setForm((f) => ({ ...f, sector_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um setor..." />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDrawer>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={(open) => {
        setIsMembersDialogOpen(open)
        if (!open) setManagingGroupId(null)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Membros — {managingGroup?.name}</DialogTitle>
            <DialogDescription>
              Adicione ou remova membros deste grupo. As alterações são aplicadas imediatamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[50vh] space-y-4 pr-1">
            {currentGroupMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users2 className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-primary">
                    Membros do Grupo ({currentGroupMembers.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {currentGroupMembers.map((member) => (
                    <MemberItem
                      key={member.id}
                      member={member}
                      isCurrentMember={true}
                      onAdd={handleAddMember}
                      onRemove={handleRemoveMember}
                      isPending={pendingMemberId === member.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {currentGroupMembers.length > 0 && nonGroupMembers.length > 0 && (
              <div className="border-t border-border" />
            )}

            {nonGroupMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Outros Membros ({nonGroupMembers.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {nonGroupMembers.map((member) => (
                    <MemberItem
                      key={member.id}
                      member={member}
                      isCurrentMember={false}
                      onAdd={handleAddMember}
                      onRemove={handleRemoveMember}
                      isPending={pendingMemberId === member.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {currentGroupMembers.length === 0 && nonGroupMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum membro encontrado para &quot;{memberSearchTerm}&quot;
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={!!deletingGroup}
        onOpenChange={(open) => { if (!open) setDeletingGroup(null) }}
        entityName={deletingGroup?.name ?? "este grupo de vida"}
        onConfirm={() => { if (deletingGroup) handleDelete(deletingGroup) }}
        isLoading={deleteLifeGroup.isPending}
      />
    </div>
  )
}
