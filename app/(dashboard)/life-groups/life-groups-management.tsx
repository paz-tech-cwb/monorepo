"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  MoreHorizontal,
  Users2,
  User,
  BarChart3,
  ArrowUpDown,
  UserPlus,
  UserMinus,
  Loader2,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"
import { useUpdateUser } from "@/lib/hooks/use-users"
import type { AdminUser } from "@/lib/api/types"

type SortOption = "name-asc" | "name-desc" | "date-asc" | "date-desc"

// ---------------------------------------------------------------------------
// Sub-components defined outside the main component to prevent re-mount on
// every render (avoids focus loss in inputs inside dialogs).
// ---------------------------------------------------------------------------

interface MemberItemProps {
  member: AdminUser
  isCurrentMember: boolean
  onAdd: (member: AdminUser) => void
  onRemove: (member: AdminUser) => void
  isPending: boolean
}

const MemberItem = ({
  member,
  isCurrentMember,
  onAdd,
  onRemove,
  isPending,
}: MemberItemProps) => (
  <div
    className={`flex items-center justify-between p-3 rounded-lg border ${
      isCurrentMember ? "border-primary bg-primary/5" : "border-border"
    }`}
  >
    <div className="flex-1">
      <p className="text-sm font-medium">{member.name}</p>
      <p className="text-xs text-muted-foreground">{member.email}</p>
      {(member.phone_number || member.phone) && (
        <Badge variant="outline" className="text-xs mt-1">
          {member.phone_number || member.phone}
        </Badge>
      )}
    </div>
    {isCurrentMember ? (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => onRemove(member)}
        className="text-destructive hover:text-destructive"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserMinus className="h-4 w-4 mr-1" />
            Remover
          </>
        )}
      </Button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => onAdd(member)}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-1" />
            Adicionar
          </>
        )}
      </Button>
    )}
  </div>
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LifeGroupsManagement() {
  const { data: lifeGroups, allMembers, isLoading } = useLifeGroups()
  const updateUser = useUpdateUser()

  const [searchTerm, setSearchTerm] = useState("")
  const [managingGroupName, setManagingGroupName] = useState<string | null>(null)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [memberSearchTerm, setMemberSearchTerm] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("name-asc")
  // Tracks which member id is currently being mutated
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  // ----- derived stats -------------------------------------------------------

  const totalMembers = allMembers.length
  const totalGroups = lifeGroups.length
  // TODO: update in Task 8 — life_group replaced by life_groups[]
  const membersInAGroup = allMembers.filter((m) => !!(m as any).life_group).length // eslint-disable-line
  const avgPerGroup =
    totalGroups > 0
      ? Math.round(lifeGroups.reduce((s, g) => s + g.member_count, 0) / totalGroups)
      : 0

  // ----- filtered groups list ------------------------------------------------

  const filteredGroups = lifeGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ----- members dialog logic ------------------------------------------------

  const managingGroup = lifeGroups.find((g) => g.name === managingGroupName) ?? null

  const sortedAndFilteredMembers = useMemo(() => {
    const filtered = allMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
    )

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name, "pt-BR")
        case "name-desc":
          return b.name.localeCompare(a.name, "pt-BR")
        case "date-asc":
          return (a.membership_date ?? "").localeCompare(b.membership_date ?? "")
        case "date-desc":
          return (b.membership_date ?? "").localeCompare(a.membership_date ?? "")
        default:
          return 0
      }
    })
  }, [allMembers, memberSearchTerm, sortOption])

  const currentGroupMembers = useMemo(
    // TODO: update in Task 8 — life_group replaced by life_groups[]
    () => sortedAndFilteredMembers.filter((m) => (m as any).life_group === managingGroupName), // eslint-disable-line
    [sortedAndFilteredMembers, managingGroupName]
  )

  const nonGroupMembers = useMemo(
    // TODO: update in Task 8 — life_group replaced by life_groups[]
    () => sortedAndFilteredMembers.filter((m) => (m as any).life_group !== managingGroupName), // eslint-disable-line
    [sortedAndFilteredMembers, managingGroupName]
  )

  // ----- handlers ------------------------------------------------------------

  function handleManageMembers(groupName: string) {
    setManagingGroupName(groupName)
    setMemberSearchTerm("")
    setSortOption("name-asc")
    setIsMembersDialogOpen(true)
  }

  function handleCreateGroup() {
    const name = newGroupName.trim()
    if (!name) return
    if (lifeGroups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Já existe um grupo com esse nome")
      return
    }
    setIsCreateDialogOpen(false)
    setNewGroupName("")
    handleManageMembers(name)
  }

  function handleAssignMember(member: AdminUser, groupName: string) {
    setPendingMemberId(member.id)
    updateUser.mutate(
      // @ts-expect-error // TODO: update in Task 8 — life_group replaced by life_groups[]
      { id: member.id, data: { life_group: groupName } },
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
    setPendingMemberId(member.id)
    updateUser.mutate(
      // @ts-expect-error // TODO: update in Task 8 — life_group replaced by life_groups[]
      { id: member.id, data: { life_group: "" } },
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
            <CardTitle className="text-sm font-medium">Media por Grupo</CardTitle>
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
            <p className="text-xs text-muted-foreground">membros nao alocados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="reports">Relatorios</TabsTrigger>
        </TabsList>

        {/* Groups list tab */}
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Life Groups</CardTitle>
                  <CardDescription>
                    {filteredGroups.length} grupo(s) encontrado(s)
                  </CardDescription>
                </div>
                <Button onClick={() => { setNewGroupName(""); setIsCreateDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Grupo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar grupos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {filteredGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchTerm
                    ? `Nenhum grupo encontrado para "${searchTerm}"`
                    : "Nenhum grupo cadastrado. Atribua membros a um grupo pelo cadastro de membros."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Membros</TableHead>
                      <TableHead className="w-[70px]">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.map((group) => (
                      <TableRow key={group.name}>
                        <TableCell>
                          <p className="font-medium">{group.name}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {group.member_count} membro(s)
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {group.members
                              .slice(0, 3)
                              .map((m) => m.name)
                              .join(", ")}
                            {group.member_count > 3 &&
                              ` +${group.member_count - 3} outros`}
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
                              <DropdownMenuItem
                                onClick={() => handleManageMembers(group.name)}
                              >
                                <Users2 className="mr-2 h-4 w-4" />
                                Gerenciar Membros
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
        </TabsContent>

        {/* Reports tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Distribuicao de Membros por Grupo</CardTitle>
              <CardDescription>Quantidade de membros em cada grupo</CardDescription>
            </CardHeader>
            <CardContent>
              {lifeGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado disponivel.</p>
              ) : (
                <div className="space-y-3">
                  {lifeGroups.map((group) => {
                    const percentage =
                      membersInAGroup > 0
                        ? (group.member_count / membersInAGroup) * 100
                        : 0
                    return (
                      <div
                        key={group.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate max-w-[180px]">
                            {group.name}
                          </span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {group.member_count} membro(s)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Life Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Life Group</DialogTitle>
            <DialogDescription>
              Digite o nome do grupo. Em seguida você poderá adicionar membros.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nome do grupo..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              Criar e Adicionar Membros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Membros — {managingGroupName}</DialogTitle>
            <DialogDescription>
              Adicione ou remova membros deste grupo. As alteracoes sao aplicadas
              imediatamente.
            </DialogDescription>
          </DialogHeader>

          {/* Search and Sort Controls */}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOption("name-asc")}>
                  Nome (A-Z) {sortOption === "name-asc" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("name-desc")}>
                  Nome (Z-A) {sortOption === "name-desc" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("date-asc")}>
                  Data de entrada (mais antigo) {sortOption === "date-asc" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("date-desc")}>
                  Data de entrada (mais recente) {sortOption === "date-desc" && "✓"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="overflow-y-auto max-h-[50vh] space-y-4 pr-1">
            {/* Current group members */}
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
                      onAdd={(m) =>
                        managingGroupName && handleAssignMember(m, managingGroupName)
                      }
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

            {/* Non-members */}
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
                      onAdd={(m) =>
                        managingGroupName && handleAssignMember(m, managingGroupName)
                      }
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
    </div>
  )
}
