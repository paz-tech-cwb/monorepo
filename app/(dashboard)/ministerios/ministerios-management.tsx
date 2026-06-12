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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Plus, MoreHorizontal, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import {
  useAtmosphereMinistries,
  useCreateAtmosphereMinistry, useUpdateAtmosphereMinistry, useDeleteAtmosphereMinistry,
  useCreateAtmosphereTeam, useUpdateAtmosphereTeam, useDeleteAtmosphereTeam,
  useAddMinistryMember, useRemoveMinistryMember,
} from "@/lib/hooks/use-atmosphere"
import { useUsers } from "@/lib/hooks/use-users"
import type { AtmosphereMinistry, AtmosphereTeam } from "@/lib/api/types"

export function MisteriosManagement() {
  const { data: ministries = [], isLoading } = useAtmosphereMinistries()
  const createMinistry = useCreateAtmosphereMinistry()
  const updateMinistry = useUpdateAtmosphereMinistry()
  const deleteMinistry = useDeleteAtmosphereMinistry()
  const createTeam = useCreateAtmosphereTeam()
  const updateTeam = useUpdateAtmosphereTeam()
  const deleteTeam = useDeleteAtmosphereTeam()

  const [ministryDialog, setMinistryDialog] = useState<"add" | AtmosphereMinistry | null>(null)
  const [teamDialog, setTeamDialog] = useState<"add" | AtmosphereTeam | null>(null)
  const [teamMinistryId, setTeamMinistryId] = useState<number | null>(null)
  const [deletingMinistryId, setDeletingMinistryId] = useState<number | null>(null)
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null)
  const [expandedMinistries, setExpandedMinistries] = useState<Set<number>>(new Set())
  const [ministryForm, setMinistryForm] = useState({ name: "" })
  const [teamForm, setTeamForm] = useState({ name: "" })

  const toggleExpand = (id: number) => {
    setExpandedMinistries((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSaveMinistry = async () => {
    if (!ministryForm.name.trim()) return toast.error("Nome é obrigatório")
    if (ministryDialog === "add") {
      await createMinistry.mutateAsync({ name: ministryForm.name })
      toast.success("Ministério criado")
    } else if (ministryDialog) {
      await updateMinistry.mutateAsync({ id: (ministryDialog as AtmosphereMinistry).id, name: ministryForm.name })
      toast.success("Ministério atualizado")
    }
    setMinistryDialog(null)
    setMinistryForm({ name: "" })
  }

  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) return toast.error("Nome é obrigatório")
    if (teamDialog === "add" && teamMinistryId) {
      await createTeam.mutateAsync({ name: teamForm.name, ministry_id: teamMinistryId })
      toast.success("Equipe criada")
    } else if (teamDialog && teamDialog !== "add") {
      await updateTeam.mutateAsync({ id: (teamDialog as AtmosphereTeam).id, name: teamForm.name })
      toast.success("Equipe atualizada")
    }
    setTeamDialog(null)
    setTeamForm({ name: "" })
  }

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ministérios</h1>
          <p className="text-muted-foreground">Ministérios e equipes de serviço</p>
        </div>
        <Dialog open={ministryDialog === "add"} onOpenChange={(o) => { setMinistryDialog(o ? "add" : null); setMinistryForm({ name: "" }) }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Ministério</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Ministério</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={ministryForm.name} onChange={(e) => setMinistryForm({ name: e.target.value })} />
            </div>
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
              <button className="flex items-center gap-2 font-semibold text-left" onClick={() => toggleExpand(ministry.id)}>
                {expandedMinistries.has(ministry.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {ministry.name}
              </button>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setTeamMinistryId(ministry.id); setTeamDialog("add"); setTeamForm({ name: "" }) }}>
                  <Plus className="w-3 h-3 mr-1" />Equipe
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => { setMinistryDialog(ministry); setMinistryForm({ name: ministry.name }) }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMinistryId(ministry.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          {expandedMinistries.has(ministry.id) && (
            <CardContent>
              <Tabs defaultValue="equipes">
                <TabsList className="mb-4">
                  <TabsTrigger value="equipes">Equipes</TabsTrigger>
                  <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
                </TabsList>

                <TabsContent value="equipes">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Líder</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ministry.teams ?? []).map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>{team.name}</TableCell>
                          <TableCell>{team.leader?.name ?? "—"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => { setTeamDialog(team); setTeamForm({ name: team.name }) }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeletingTeamId(team.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(ministry.teams ?? []).length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma equipe</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="pessoas">
                  <MinistryPeopleTab ministry={ministry} />
                </TabsContent>
              </Tabs>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Edit ministry dialog */}
      <Dialog open={ministryDialog !== null && ministryDialog !== "add"} onOpenChange={(o) => { if (!o) setMinistryDialog(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Ministério</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={ministryForm.name} onChange={(e) => setMinistryForm({ name: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveMinistry} disabled={updateMinistry.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/edit team dialog */}
      <Dialog open={teamDialog !== null} onOpenChange={(o) => { if (!o) setTeamDialog(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{teamDialog === "add" ? "Nova Equipe" : "Editar Equipe"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={teamForm.name} onChange={(e) => setTeamForm({ name: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTeam} disabled={createTeam.isPending || updateTeam.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deletingMinistryId !== null}
        onConfirm={async () => { await deleteMinistry.mutateAsync(deletingMinistryId!); setDeletingMinistryId(null); toast.success("Ministério excluído") }}
        onCancel={() => setDeletingMinistryId(null)}
        description="Isso também excluirá todas as equipes deste ministério."
      />
      <ConfirmDeleteDialog
        open={deletingTeamId !== null}
        onConfirm={async () => { await deleteTeam.mutateAsync(deletingTeamId!); setDeletingTeamId(null); toast.success("Equipe excluída") }}
        onCancel={() => setDeletingTeamId(null)}
      />
    </div>
  )
}

function MinistryPeopleTab({ ministry }: { ministry: AtmosphereMinistry }) {
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
            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum membro</TableCell></TableRow>
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
