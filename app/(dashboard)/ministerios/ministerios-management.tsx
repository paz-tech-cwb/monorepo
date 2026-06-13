"use client"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
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

  const [ministryDialog, setMinistryDialog] = useState<"add" | Ministry | null>(null)
  const [teamDialog, setTeamDialog] = useState<"add" | MinistryTeam | null>(null)
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
    if (ministryDialog === "add") {
      setMinistryForm((f) => ({ ...f, membership_mode: newMode }))
      return
    }
    const current = ministryDialog as Ministry
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
    const payload = {
      name: ministryForm.name,
      description: ministryForm.description || undefined,
      membership_mode: ministryForm.membership_mode,
      ...(ministryForm.leader_id != null ? { leader_id: ministryForm.leader_id } : {}),
      ...(ministryForm.co_leader_id != null ? { co_leader_id: ministryForm.co_leader_id } : {}),
    }
    if (ministryDialog === "add") {
      await createMinistry.mutateAsync(payload)
      toast.success("Ministério criado")
    } else if (ministryDialog) {
      await updateMinistry.mutateAsync({ id: (ministryDialog as Ministry).id, ...payload })
      toast.success("Ministério atualizado")
    }
    setMinistryDialog(null)
    setMinistryForm(defaultMinistryForm)
  }

  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) return toast.error("Nome é obrigatório")
    const teamPayload = {
      name: teamForm.name,
      ...(teamForm.leader_id != null ? { leader_id: teamForm.leader_id } : {}),
      ...(teamForm.co_leader_id != null ? { co_leader_id: teamForm.co_leader_id } : {}),
    }
    if (teamDialog === "add" && teamMinistryId) {
      await createTeam.mutateAsync({ ...teamPayload, ministry_id: teamMinistryId })
      toast.success("Equipe criada")
    } else if (teamDialog && teamDialog !== "add") {
      await updateTeam.mutateAsync({ id: (teamDialog as MinistryTeam).id, ...teamPayload })
      toast.success("Equipe atualizada")
    }
    setTeamDialog(null)
    setTeamForm(defaultTeamForm)
  }

  const openAddMinistry = (open: boolean) => {
    setMinistryDialog(open ? "add" : null)
    setMinistryForm(defaultMinistryForm)
  }

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ministérios</h1>
          <p className="text-muted-foreground">Ministérios e equipes de serviço</p>
        </div>
        <Dialog open={ministryDialog === "add"} onOpenChange={openAddMinistry}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Ministério</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Ministério</DialogTitle></DialogHeader>
            <MinistryFormFields
              form={ministryForm}
              users={allUsers}
              onChange={(patch) => setMinistryForm((f) => ({ ...f, ...patch }))}
              onMembershipModeChange={handleMembershipModeChange}
            />
            <DialogFooter>
              <Button onClick={handleSaveMinistry} disabled={createMinistry.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                      setTeamDialog("add")
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
                    <DropdownMenuItem onClick={() => {
                      setMinistryDialog(ministry)
                      setMinistryForm({
                        name: ministry.name,
                        description: ministry.description ?? "",
                        membership_mode: ministry.membership_mode,
                        leader_id: ministry.leader?.id ?? null,
                        co_leader_id: ministry.co_leader?.id ?? null,
                      })
                    }}>
                      <Edit className="w-4 h-4 mr-2" />Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMinistryId(ministry.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          {expandedMinistries.has(ministry.id) && (
            <CardContent>
              {ministry.membership_mode === "teams" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Liderança</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ministry.teams ?? []).map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>{team.name}</TableCell>
                        <TableCell>{leaderPairLabel(team.leader, team.co_leader)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => {
                                setTeamDialog(team)
                                setTeamForm({
                                  name: team.name,
                                  leader_id: team.leader?.id ?? null,
                                  co_leader_id: team.co_leader?.id ?? null,
                                })
                              }}>
                                <Edit className="w-4 h-4 mr-2" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeletingTeamId(team.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(ministry.teams ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma equipe</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <MinistryPeopleTab ministry={ministry} />
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Edit ministry dialog */}
      <Dialog
        open={ministryDialog !== null && ministryDialog !== "add"}
        onOpenChange={(o) => { if (!o) { setMinistryDialog(null); setMinistryForm(defaultMinistryForm) } }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Ministério</DialogTitle></DialogHeader>
          <MinistryFormFields
            form={ministryForm}
            users={allUsers}
            onChange={(patch) => setMinistryForm((f) => ({ ...f, ...patch }))}
            onMembershipModeChange={handleMembershipModeChange}
          />
          <DialogFooter>
            <Button onClick={handleSaveMinistry} disabled={updateMinistry.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/edit team dialog */}
      <Dialog open={teamDialog !== null} onOpenChange={(o) => { if (!o) setTeamDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{teamDialog === "add" ? "Nova Equipe" : "Editar Equipe"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTeam} disabled={createTeam.isPending || updateTeam.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        onConfirm={async () => {
          await deleteMinistry.mutateAsync(deletingMinistryId!)
          setDeletingMinistryId(null)
          toast.success("Ministério excluído")
        }}
        onCancel={() => setDeletingMinistryId(null)}
        description="Isso também excluirá todas as equipes deste ministério."
      />
      <ConfirmDeleteDialog
        open={deletingTeamId !== null}
        onConfirm={async () => {
          await deleteTeam.mutateAsync(deletingTeamId!)
          setDeletingTeamId(null)
          toast.success("Equipe excluída")
        }}
        onCancel={() => setDeletingTeamId(null)}
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
// MinistryPeopleTab
// ---------------------------------------------------------------------------

function MinistryPeopleTab({ ministry }: { ministry: Ministry }) {
  const { data: allUsers = [] } = useUsers()
  const addMember = useAddMinistryMember()
  const removeMember = useRemoveMinistryMember()
  const [search, setSearch] = useState("")

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
                  onClick={() => removeMember.mutate({ ministryId: ministry.id, userId: m.id })}
                >
                  Remover
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(ministry.members ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum membro</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div>
        <Label className="text-sm mb-1 block">Adicionar pessoa</Label>
        <Command className="border rounded-md">
          <CommandInput placeholder="Buscar por nome..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-40">
            {candidates.slice(0, 10).map((u) => (
              <CommandItem
                key={u.id}
                onSelect={() => {
                  addMember.mutate({ ministryId: ministry.id, userId: u.id })
                  setSearch("")
                }}
              >
                {u.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
