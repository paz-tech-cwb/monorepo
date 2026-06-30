"use client"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Plus, MoreHorizontal, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import {
  useMinistries,
  useCreateMinistry,
  useUpdateMinistry,
  useDeleteMinistry,
  useCreateMinistryTeam,
  useUpdateMinistryTeam,
  useDeleteMinistryTeam,
  useAddMinistryMember,
  useRemoveMinistryMember,
  useAddMinistryTeamMember,
  useRemoveMinistryTeamMember,
} from "@/lib/hooks/use-ministries"
import { useUsers } from "@/lib/hooks/use-users"
import { LeaderPairPicker } from "@/components/ministries/leader-pair-picker"
import type { Ministry, MinistryTeam, MembershipMode } from "@/lib/api/types"

type MinistryFormState = {
  name: string
  description: string
  membership_mode: MembershipMode
  leader_id: number | null
  co_leader_id: number | null
}

type TeamFormState = {
  name: string
  leader_id: number | null
  co_leader_id: number | null
}

const defaultMinistryForm: MinistryFormState = {
  name: "",
  description: "",
  membership_mode: "teams",
  leader_id: null,
  co_leader_id: null,
}

const defaultTeamForm: TeamFormState = { name: "", leader_id: null, co_leader_id: null }

function leaderPairLabel(
  leader: { name: string } | null,
  coLeader: { name: string } | null,
): string {
  if (!leader) return "—"
  return coLeader ? `${leader.name} & ${coLeader.name}` : leader.name
}

export function MisteriosManagement() {
  const { data: ministries = [], isLoading } = useMinistries()
  const createMinistry = useCreateMinistry()
  const updateMinistry = useUpdateMinistry()
  const deleteMinistry = useDeleteMinistry()
  const createTeam = useCreateMinistryTeam()
  const updateTeam = useUpdateMinistryTeam()
  const deleteTeam = useDeleteMinistryTeam()

  const { data: allUsers = [] } = useUsers()

  // "add" = create new, Ministry object = editing existing, null = closed
  const [ministrySheet, setMinistrySheet] = useState<"add" | Ministry | null>(null)
  const [teamSheet, setTeamSheet] = useState<"add" | MinistryTeam | null>(null)
  const [teamMinistryId, setTeamMinistryId] = useState<number | null>(null)
  const [deletingMinistryId, setDeletingMinistryId] = useState<number | null>(null)
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null)
  const [expandedMinistries, setExpandedMinistries] = useState<Set<number>>(new Set())
  const [ministryForm, setMinistryForm] = useState<MinistryFormState>(defaultMinistryForm)
  const [teamForm, setTeamForm] = useState<TeamFormState>(defaultTeamForm)
  const [confirmModeSwitch, setConfirmModeSwitch] = useState<MembershipMode | null>(null)

  const toggleExpand = (id: number) => {
    setExpandedMinistries((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleMembershipModeChange = (newMode: MembershipMode) => {
    if (ministrySheet === "add") {
      setMinistryForm((f) => ({ ...f, membership_mode: newMode }))
      return
    }
    const current = ministrySheet as Ministry
    if (newMode === "direct" && (current.teams?.length ?? 0) > 0) {
      setConfirmModeSwitch(newMode)
    } else if (newMode === "teams" && (current.members?.length ?? 0) > 0) {
      setConfirmModeSwitch(newMode)
    } else {
      setMinistryForm((f) => ({ ...f, membership_mode: newMode }))
    }
  }

  const handleSaveMinistry = async () => {
    if (!ministryForm.name.trim()) return toast.error("Nome é obrigatório")
    if (ministryForm.leader_id == null) return toast.error("Líder é obrigatório")
    const payload = {
      name: ministryForm.name,
      description: ministryForm.description || undefined,
      membership_mode: ministryForm.membership_mode,
      leader_id: ministryForm.leader_id ?? undefined,
      co_leader_id: ministryForm.co_leader_id ?? undefined,
    }
    if (ministrySheet === "add") {
      await createMinistry.mutateAsync(payload)
      toast.success("Ministério criado")
    } else if (ministrySheet) {
      await updateMinistry.mutateAsync({ id: (ministrySheet as Ministry).id, ...payload })
      toast.success("Ministério atualizado")
    }
    setMinistrySheet(null)
    setMinistryForm(defaultMinistryForm)
  }

  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) return toast.error("Nome é obrigatório")
    const teamPayload = {
      name: teamForm.name,
      leader_id: teamForm.leader_id ?? undefined,
      co_leader_id: teamForm.co_leader_id ?? undefined,
    }
    if (teamSheet === "add" && teamMinistryId) {
      await createTeam.mutateAsync({ ...teamPayload, ministry_id: teamMinistryId })
      toast.success("Equipe criada")
    } else if (teamSheet && teamSheet !== "add") {
      await updateTeam.mutateAsync({ id: (teamSheet as MinistryTeam).id, ...teamPayload })
      toast.success("Equipe atualizada")
    }
    setTeamSheet(null)
    setTeamForm(defaultTeamForm)
  }

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ministérios</h1>
          <p className="text-muted-foreground">Ministérios e equipes de serviço</p>
        </div>
        <Button onClick={() => { setMinistrySheet("add"); setMinistryForm(defaultMinistryForm) }}>
          <Plus className="w-4 h-4 mr-2" />Novo Ministério
        </Button>
      </div>

      {ministries.map((ministry) => (
        <Card key={ministry.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <button
                className="flex flex-col items-start gap-0.5 text-left"
                onClick={() => toggleExpand(ministry.id)}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {expandedMinistries.has(ministry.id)
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />}
                  {ministry.name}
                </span>
                {ministry.description && (
                  <span className="pl-6 text-sm text-muted-foreground">
                    {ministry.description}
                  </span>
                )}
                <span className="pl-6 text-xs text-muted-foreground">
                  {leaderPairLabel(ministry.leader, ministry.co_leader)}
                </span>
              </button>
              <div className="flex items-center gap-2">
                {ministry.membership_mode === "teams" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTeamMinistryId(ministry.id)
                      setTeamSheet("add")
                      setTeamForm(defaultTeamForm)
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />Equipe
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setTimeout(() => {
                      setMinistrySheet(ministry)
                      setMinistryForm({
                        name: ministry.name,
                        description: ministry.description ?? "",
                        membership_mode: ministry.membership_mode,
                        leader_id: ministry.leader?.id ?? null,
                        co_leader_id: ministry.co_leader?.id ?? null,
                      })
                    }, 0)}>
                      <Edit className="w-4 h-4 mr-2" />Editar
                    </DropdownMenuItem>
                    {!ministry.is_permanent && (
                      <DropdownMenuItem className="text-destructive" onClick={() => setTimeout(() => setDeletingMinistryId(ministry.id), 0)}>
                        <Trash2 className="w-4 h-4 mr-2" />Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          {expandedMinistries.has(ministry.id) && (
            <CardContent>
              {ministry.membership_mode === "teams" ? (
                <div className="space-y-2">
                  {(ministry.teams ?? []).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Nenhuma equipe</p>
                  )}
                  {(ministry.teams ?? []).map((team) => (
                    <TeamSection
                      key={team.id}
                      team={team}
                      allUsers={allUsers}
                      onEdit={() => setTimeout(() => {
                        setTeamSheet(team)
                        setTeamForm({
                          name: team.name,
                          leader_id: team.leader?.id ?? null,
                          co_leader_id: team.co_leader?.id ?? null,
                        })
                      }, 0)}
                      onDelete={() => setTimeout(() => setDeletingTeamId(team.id), 0)}
                    />
                  ))}
                </div>
              ) : (
                <MinistryPeopleTab ministry={ministry} />
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Ministry drawer (create + edit) */}
      <Sheet
        open={ministrySheet !== null}
        onOpenChange={(o) => { if (!o) { setMinistrySheet(null); setMinistryForm(defaultMinistryForm) } }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{ministrySheet === "add" ? "Novo Ministério" : "Editar Ministério"}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <MinistryFormFields
              form={ministryForm}
              users={allUsers}
              onChange={(patch) => setMinistryForm((f) => ({ ...f, ...patch }))}
              onMembershipModeChange={handleMembershipModeChange}
            />
          </SheetBody>
          <SheetFooter>
            <Button
              onClick={handleSaveMinistry}
              disabled={createMinistry.isPending || updateMinistry.isPending}
            >
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Team drawer (create + edit) */}
      <Sheet
        open={teamSheet !== null}
        onOpenChange={(o) => { if (!o) setTeamSheet(null) }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{teamSheet === "add" ? "Nova Equipe" : "Editar Equipe"}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={teamForm.name} onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <LeaderPairPicker
              users={allUsers}
              leaderId={teamForm.leader_id}
              coLeaderId={teamForm.co_leader_id}
              onLeaderChange={(id) => setTeamForm((f) => ({ ...f, leader_id: id }))}
              onCoLeaderChange={(id) => setTeamForm((f) => ({ ...f, co_leader_id: id }))}
            />
          </SheetBody>
          <SheetFooter>
            <Button onClick={handleSaveTeam} disabled={createTeam.isPending || updateTeam.isPending}>Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Mode switch confirm dialog */}
      <Dialog open={confirmModeSwitch !== null} onOpenChange={(o) => { if (!o) setConfirmModeSwitch(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar modo de membros</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmModeSwitch === "direct"
              ? "Mudar para pessoas diretas vai ocultar as equipes existentes."
              : "Mudar para equipes vai ocultar as pessoas diretamente vinculadas."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModeSwitch(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (confirmModeSwitch) {
                setMinistryForm((f) => ({ ...f, membership_mode: confirmModeSwitch }))
              }
              setConfirmModeSwitch(null)
            }}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deletingMinistryId !== null}
        onOpenChange={(o) => { if (!o) setDeletingMinistryId(null) }}
        entityName="Ministério"
        onConfirm={async () => {
          await deleteMinistry.mutateAsync(deletingMinistryId!)
          setDeletingMinistryId(null)
          toast.success("Ministério excluído")
        }}
      />
      <ConfirmDeleteDialog
        open={deletingTeamId !== null}
        onOpenChange={(o) => { if (!o) setDeletingTeamId(null) }}
        entityName="Equipe"
        onConfirm={async () => {
          await deleteTeam.mutateAsync(deletingTeamId!)
          setDeletingTeamId(null)
          toast.success("Equipe excluída")
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// MinistryFormFields
// ---------------------------------------------------------------------------

interface UserOption { id: number; name: string }

interface MinistryFormFieldsProps {
  form: {
    name: string
    description: string
    membership_mode: MembershipMode
    leader_id: number | null
    co_leader_id: number | null
  }
  users: UserOption[]
  onChange: (patch: Partial<MinistryFormFieldsProps["form"]>) => void
  onMembershipModeChange: (mode: MembershipMode) => void
}

function MinistryFormFields({ form, users, onChange, onMembershipModeChange }: MinistryFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="O que é este ministério"
        />
      </div>
      <LeaderPairPicker
        users={users}
        leaderId={form.leader_id}
        coLeaderId={form.co_leader_id}
        onLeaderChange={(id) => onChange({ leader_id: id })}
        onCoLeaderChange={(id) => onChange({ co_leader_id: id })}
        leaderRequired
      />
      <div className="space-y-2">
        <Label>Modo de membros</Label>
        <Select
          value={form.membership_mode}
          onValueChange={(v) => onMembershipModeChange(v as MembershipMode)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="teams">Equipes</SelectItem>
            <SelectItem value="direct">Pessoas diretamente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TeamSection — expandable team card with member management
// ---------------------------------------------------------------------------

interface TeamSectionProps {
  team: MinistryTeam
  allUsers: { id: number; name: string }[]
  onEdit: () => void
  onDelete: () => void
}

function TeamSection({ team, allUsers, onEdit, onDelete }: TeamSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [search, setSearch] = useState("")
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)
  const addMember = useAddMinistryTeamMember()
  const removeMember = useRemoveMinistryTeamMember()

  const memberIds = new Set(team.members?.map((m) => m.id) ?? [])
  const candidates = allUsers.filter(
    (u) => !memberIds.has(u.id) && u.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="border rounded-md">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          className="flex items-center gap-2 font-medium text-left flex-1"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          <span>{team.name}</span>
          {leaderPairLabel(team.leader, team.co_leader) !== "—" && (
            <span className="text-sm text-muted-foreground font-normal">
              — {leaderPairLabel(team.leader, team.co_leader)}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto mr-2">
            {(team.members ?? []).length} pessoa{(team.members ?? []).length !== 1 ? "s" : ""}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onEdit}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(team.members ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setRemovingMemberId(m.id)}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(team.members ?? []).length === 0 && (
                <TableRow key="empty"><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum membro</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div>
            {addingMember ? (
              <Command className="border rounded-md">
                <CommandInput
                  placeholder="Buscar por nome..."
                  value={search}
                  onValueChange={setSearch}
                  autoFocus
                />
                <CommandList className="max-h-40">
                  {candidates.slice(0, 10).map((u) => (
                    <CommandItem
                      key={u.id}
                      onSelect={() => {
                        addMember.mutate({ teamId: team.id, userId: u.id })
                        setSearch("")
                        setAddingMember(false)
                      }}
                    >
                      {u.name}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAddingMember(true)}>
                <Plus className="w-3 h-3 mr-1" />Adicionar pessoa
              </Button>
            )}
          </div>
        </div>
      )}
      <ConfirmDeleteDialog
        open={removingMemberId !== null}
        onOpenChange={(o) => { if (!o) setRemovingMemberId(null) }}
        entityName="membro da equipe"
        onConfirm={() => {
          removeMember.mutate({ teamId: team.id, userId: removingMemberId! })
          setRemovingMemberId(null)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// MinistryPeopleTab
// ---------------------------------------------------------------------------

function MinistryPeopleTab({ ministry }: { ministry: Ministry }) {
  const { data: allUsers = [] } = useUsers()
  const addMember = useAddMinistryMember()
  const removeMember = useRemoveMinistryMember()
  const [addingMember, setAddingMember] = useState(false)
  const [search, setSearch] = useState("")
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)

  const memberIds = new Set(ministry.members?.map((m) => m.id) ?? [])
  const candidates = allUsers.filter(
    (u) => !memberIds.has(u.id) && u.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(ministry.members ?? []).map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.name}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setRemovingMemberId(m.id)}
                >
                  Remover
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(ministry.members ?? []).length === 0 && (
            <TableRow key="empty">
              <TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum membro</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div>
        {addingMember ? (
          <Command className="border rounded-md">
            <CommandInput
              placeholder="Buscar por nome..."
              value={search}
              onValueChange={setSearch}
              autoFocus
            />
            <CommandList className="max-h-40">
              {candidates.slice(0, 10).map((u) => (
                <CommandItem
                  key={u.id}
                  onSelect={() => {
                    addMember.mutate({ ministryId: ministry.id, userId: u.id })
                    setSearch("")
                    setAddingMember(false)
                  }}
                >
                  {u.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAddingMember(true)}>
            <Plus className="w-3 h-3 mr-1" />Adicionar pessoa
          </Button>
        )}
      </div>
      <ConfirmDeleteDialog
        open={removingMemberId !== null}
        onOpenChange={(o) => { if (!o) setRemovingMemberId(null) }}
        entityName="membro do ministério"
        onConfirm={() => {
          removeMember.mutate({ ministryId: ministry.id, userId: removingMemberId! })
          setRemovingMemberId(null)
        }}
      />
    </div>
  )
}
