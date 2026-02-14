"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Users2, User, BarChart3, Calendar, ArrowUpDown, UserPlus, UserMinus, MapPin } from "lucide-react"
import { AddressForm, type AddressFormData } from "@/components/ui/address-form"

interface Member {
  id: string
  name: string
  email: string
  phone: string
  joinedAt: string
}

interface Address {
  cep: string
  country: string
  state: string
  city: string
  street: string
  number: string
}

interface LifeGroup {
  id: string
  name: string
  description: string
  leader: string
  leaderContact: string
  category: "jovens" | "adultos" | "idosos" | "criancas" | "casais" | "mulheres" | "homens"
  memberIds: string[]
  meetingDay: string
  meetingTime: string
  address: Address
  status: "active" | "inactive"
  created_at: string
}

// Mock available members
const availableMembers: Member[] = [
  {
    id: "1",
    name: "Ana Silva",
    email: "ana.silva@email.com",
    phone: "(11) 98888-1111",
    joinedAt: "2023-01-10",
  },
  {
    id: "2",
    name: "Bruno Costa",
    email: "bruno.costa@email.com",
    phone: "(11) 98888-2222",
    joinedAt: "2023-01-12",
  },
  {
    id: "3",
    name: "Carla Mendes",
    email: "carla.mendes@email.com",
    phone: "(11) 98888-3333",
    joinedAt: "2023-01-15",
  },
  {
    id: "4",
    name: "Daniel Oliveira",
    email: "daniel.oliveira@email.com",
    phone: "(11) 98888-4444",
    joinedAt: "2023-02-01",
  },
  {
    id: "5",
    name: "Elisa Santos",
    email: "elisa.santos@email.com",
    phone: "(11) 98888-5555",
    joinedAt: "2023-02-05",
  },
  {
    id: "6",
    name: "Felipe Rocha",
    email: "felipe.rocha@email.com",
    phone: "(11) 98888-6666",
    joinedAt: "2023-02-10",
  },
  {
    id: "7",
    name: "Gabriela Lima",
    email: "gabriela.lima@email.com",
    phone: "(11) 98888-7777",
    joinedAt: "2023-02-15",
  },
  {
    id: "8",
    name: "Henrique Alves",
    email: "henrique.alves@email.com",
    phone: "(11) 98888-8888",
    joinedAt: "2023-02-20",
  },
  {
    id: "9",
    name: "Isabela Ferreira",
    email: "isabela.ferreira@email.com",
    phone: "(11) 98888-9999",
    joinedAt: "2023-03-01",
  },
  {
    id: "10",
    name: "João Pedro",
    email: "joao.pedro@email.com",
    phone: "(11) 98888-0000",
    joinedAt: "2023-03-05",
  },
  {
    id: "11",
    name: "Karina Souza",
    email: "karina.souza@email.com",
    phone: "(11) 98888-1234",
    joinedAt: "2023-03-10",
  },
  {
    id: "12",
    name: "Lucas Martins",
    email: "lucas.martins@email.com",
    phone: "(11) 98888-5678",
    joinedAt: "2023-03-15",
  },
  {
    id: "13",
    name: "Mariana Gomes",
    email: "mariana.gomes@email.com",
    phone: "(11) 98888-9012",
    joinedAt: "2023-03-20",
  },
  {
    id: "14",
    name: "Nathalia Barbosa",
    email: "nathalia.barbosa@email.com",
    phone: "(11) 98888-3456",
    joinedAt: "2023-03-25",
  },
  {
    id: "15",
    name: "Otávio Reis",
    email: "otavio.reis@email.com",
    phone: "(11) 98888-7890",
    joinedAt: "2023-04-01",
  },
]

const mockLifeGroups: LifeGroup[] = [
  {
    id: "1",
    name: "Jovens Unidos",
    description: "Grupo de jovens focado em crescimento espiritual",
    leader: "Carlos Silva",
    leaderContact: "(11) 99999-1111",
    category: "jovens",
    memberIds: ["1", "2", "3", "7", "9"],
    meetingDay: "Sexta-feira",
    meetingTime: "19:30",
    address: {
      cep: "80410-100",
      country: "Brasil",
      state: "PR",
      city: "Curitiba",
      street: "Rua das Flores",
      number: "100",
    },
    status: "active",
    created_at: "2023-01-15",
  },
  {
    id: "2",
    name: "Mulheres de Fé",
    description: "Grupo de mulheres para oração e estudo bíblico",
    leader: "Maria Santos",
    leaderContact: "(11) 99999-2222",
    category: "mulheres",
    memberIds: ["5", "11", "13", "14"],
    meetingDay: "Terça-feira",
    meetingTime: "14:00",
    address: {
      cep: "80420-200",
      country: "Brasil",
      state: "PR",
      city: "Curitiba",
      street: "Av. Sete de Setembro",
      number: "200",
    },
    status: "active",
    created_at: "2023-02-20",
  },
  {
    id: "3",
    name: "Homens de Valor",
    description: "Grupo masculino para discipulado",
    leader: "João Oliveira",
    leaderContact: "(11) 99999-3333",
    category: "homens",
    memberIds: ["4", "6", "8", "10", "12", "15"],
    meetingDay: "Sábado",
    meetingTime: "08:00",
    address: {
      cep: "80430-300",
      country: "Brasil",
      state: "PR",
      city: "Curitiba",
      street: "Rua XV de Novembro",
      number: "300",
    },
    status: "active",
    created_at: "2023-03-10",
  },
  {
    id: "4",
    name: "Família Abençoada",
    description: "Grupo para casais e famílias",
    leader: "Pedro e Ana Costa",
    leaderContact: "(11) 99999-4444",
    category: "casais",
    memberIds: ["1", "4", "5"],
    meetingDay: "Domingo",
    meetingTime: "16:00",
    address: {
      cep: "80440-400",
      country: "Brasil",
      state: "PR",
      city: "Curitiba",
      street: "Rua Marechal Deodoro",
      number: "400",
    },
    status: "active",
    created_at: "2023-04-05",
  },
]

type SortOption = "name-asc" | "name-desc" | "date-asc" | "date-desc"

// Move GroupForm outside to prevent focus loss on re-renders
const GroupForm = ({ isEdit = false, newGroup, setNewGroup }: { isEdit?: boolean; newGroup: any; setNewGroup: any }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor={isEdit ? "edit-name" : "name"}>Nome do Grupo</Label>
        <Input
          id={isEdit ? "edit-name" : "name"}
          value={newGroup.name}
          onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
          placeholder="Nome do grupo"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor={isEdit ? "edit-description" : "description"}>Descrição</Label>
        <Textarea
          id={isEdit ? "edit-description" : "description"}
          value={newGroup.description}
          onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
          placeholder="Descrição do grupo"
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-leader" : "leader"}>Líder</Label>
        <Input
          id={isEdit ? "edit-leader" : "leader"}
          value={newGroup.leader}
          onChange={(e) => setNewGroup({ ...newGroup, leader: e.target.value })}
          placeholder="Nome do líder"
        />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-leaderContact" : "leaderContact"}>Contato do Líder</Label>
        <Input
          id={isEdit ? "edit-leaderContact" : "leaderContact"}
          value={newGroup.leaderContact}
          onChange={(e) => setNewGroup({ ...newGroup, leaderContact: e.target.value })}
          placeholder="(11) 99999-9999"
        />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-category" : "category"}>Categoria</Label>
        <select
          id={isEdit ? "edit-category" : "category"}
          value={newGroup.category}
          onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value as LifeGroup["category"] })}
          className="w-full p-2 border border-input rounded-md bg-background"
        >
          <option value="jovens">Jovens</option>
          <option value="adultos">Adultos</option>
          <option value="idosos">Idosos</option>
          <option value="criancas">Crianças</option>
          <option value="casais">Casais</option>
          <option value="mulheres">Mulheres</option>
          <option value="homens">Homens</option>
        </select>
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-meetingDay" : "meetingDay"}>Dia da Reunião</Label>
        <Input
          id={isEdit ? "edit-meetingDay" : "meetingDay"}
          value={newGroup.meetingDay}
          onChange={(e) => setNewGroup({ ...newGroup, meetingDay: e.target.value })}
          placeholder="Sexta-feira"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor={isEdit ? "edit-meetingTime" : "meetingTime"}>Horário</Label>
        <Input
          id={isEdit ? "edit-meetingTime" : "meetingTime"}
          type="time"
          value={newGroup.meetingTime}
          onChange={(e) => setNewGroup({ ...newGroup, meetingTime: e.target.value })}
        />
      </div>
    </div>

    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5" />
        Local de Reunião
      </h3>
      <AddressForm
        value={newGroup.address as AddressFormData}
        onChange={(address) => setNewGroup({ ...newGroup, address })}
        idPrefix={isEdit ? "edit-" : ""}
      />
    </div>
  </div>
)

// Move MemberItem outside to prevent focus loss on re-renders
const MemberItem = ({ member, isCurrentMember, addMember, removeMember }: { member: Member; isCurrentMember: boolean; addMember: (id: string) => void; removeMember: (id: string) => void }) => (
  <div
    className={`flex items-center justify-between p-3 rounded-lg border ${
      isCurrentMember ? "border-primary bg-primary/5" : "border-border"
    }`}
  >
    <div className="flex-1">
      <p className="text-sm font-medium">{member.name}</p>
      <p className="text-xs text-muted-foreground">{member.email}</p>
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs">
          {member.phone}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Desde {new Date(member.joinedAt).toLocaleDateString("pt-BR")}
        </Badge>
      </div>
    </div>
    {isCurrentMember ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => removeMember(member.id)}
        className="text-destructive hover:text-destructive"
      >
        <UserMinus className="h-4 w-4 mr-1" />
        Remover
      </Button>
    ) : (
      <Button variant="outline" size="sm" onClick={() => addMember(member.id)}>
        <UserPlus className="h-4 w-4 mr-1" />
        Adicionar
      </Button>
    )}
  </div>
)

export function LifeGroupsManagement() {
  const [lifeGroups, setLifeGroups] = useState<LifeGroup[]>(mockLifeGroups)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<LifeGroup | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<LifeGroup | null>(null)
  const [managingMembersGroup, setManagingMembersGroup] = useState<LifeGroup | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [memberSearchTerm, setMemberSearchTerm] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("name-asc")
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    leader: "",
    leaderContact: "",
    category: "adultos" as LifeGroup["category"],
    memberIds: [] as string[],
    meetingDay: "",
    meetingTime: "",
    address: {
      cep: "",
      country: "Brasil",
      state: "",
      city: "",
      street: "",
      number: "",
    },
  })

  const filteredGroups = lifeGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.leader.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getMembersByIds = (memberIds: string[]) => {
    return availableMembers.filter((member) => memberIds.includes(member.id))
  }

  // Sort and filter members for the dialog
  const sortedAndFilteredMembers = useMemo(() => {
    let filtered = availableMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
    )

    return filtered.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "date-asc":
          return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
        case "date-desc":
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        default:
          return 0
      }
    })
  }, [memberSearchTerm, sortOption])

  // Separate members into current members and non-members
  const currentMembers = useMemo(() => {
    return sortedAndFilteredMembers.filter((member) => selectedMemberIds.includes(member.id))
  }, [sortedAndFilteredMembers, selectedMemberIds])

  const nonMembers = useMemo(() => {
    return sortedAndFilteredMembers.filter((member) => !selectedMemberIds.includes(member.id))
  }, [sortedAndFilteredMembers, selectedMemberIds])

  const handleAddGroup = () => {
    const group: LifeGroup = {
      id: Date.now().toString(),
      ...newGroup,
      status: "active",
      created_at: new Date().toISOString().split("T")[0],
    }
    setLifeGroups([...lifeGroups, group])
    setNewGroup({
      name: "",
      description: "",
      leader: "",
      leaderContact: "",
      category: "adultos",
      memberIds: [],
      meetingDay: "",
      meetingTime: "",
      address: {
        cep: "",
        country: "Brasil",
        state: "",
        city: "",
        street: "",
        number: "",
      },
    })
    setIsAddDialogOpen(false)
  }

  const handleEditGroup = (group: LifeGroup) => {
    setEditingGroup(group)
    setNewGroup({
      name: group.name,
      description: group.description,
      leader: group.leader,
      leaderContact: group.leaderContact,
      category: group.category,
      memberIds: group.memberIds,
      meetingDay: group.meetingDay,
      meetingTime: group.meetingTime,
      address: group.address,
    })
  }

  const handleUpdateGroup = () => {
    if (!editingGroup) return

    setLifeGroups(lifeGroups.map((group) => (group.id === editingGroup.id ? { ...group, ...newGroup } : group)))
    setEditingGroup(null)
    setNewGroup({
      name: "",
      description: "",
      leader: "",
      leaderContact: "",
      category: "adultos",
      memberIds: [],
      meetingDay: "",
      meetingTime: "",
      address: {
        cep: "",
        country: "Brasil",
        state: "",
        city: "",
        street: "",
        number: "",
      },
    })
  }

  const handleDeleteGroup = (groupId: string) => {
    setLifeGroups(lifeGroups.filter((group) => group.id !== groupId))
  }

  const handleManageMembers = (group: LifeGroup) => {
    setManagingMembersGroup(group)
    setSelectedMemberIds(group.memberIds)
    setMemberSearchTerm("")
    setSortOption("name-asc")
    setIsMembersDialogOpen(true)
  }

  const handleSaveMembers = () => {
    if (!managingMembersGroup) return

    setLifeGroups(lifeGroups.map((group) =>
      group.id === managingMembersGroup.id
        ? {
            ...group,
            memberIds: selectedMemberIds,
          }
        : group
    ))
    setIsMembersDialogOpen(false)
    setManagingMembersGroup(null)
    setSelectedMemberIds([])
    setMemberSearchTerm("")
  }

  const addMember = (memberId: string) => {
    setSelectedMemberIds((prev) => [...prev, memberId])
  }

  const removeMember = (memberId: string) => {
    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId))
  }

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; text: string }> = {
      jovens: { variant: "default", text: "Jovens" },
      adultos: { variant: "secondary", text: "Adultos" },
      idosos: { variant: "outline", text: "Idosos" },
      criancas: { variant: "destructive", text: "Crianças" },
      casais: { variant: "default", text: "Casais" },
      mulheres: { variant: "secondary", text: "Mulheres" },
      homens: { variant: "outline", text: "Homens" },
    }

    const config = variants[category] || { variant: "outline" as const, text: category }
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Ativo" : "Inativo"}</Badge>
    )
  }

  const total_members = lifeGroups.reduce((sum, group) => sum + group.memberIds.length, 0)
  const activeGroups = lifeGroups.filter((group) => group.status === "active").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Life Groups</h1>
        <p className="text-muted-foreground">Gerencie os grupos de vida da igreja</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lifeGroups.length}</div>
            <p className="text-xs text-muted-foreground">{activeGroups} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_members}</div>
            <p className="text-xs text-muted-foreground">em todos os grupos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Grupo</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lifeGroups.length > 0 ? Math.round(total_members / lifeGroups.length) : 0}</div>
            <p className="text-xs text-muted-foreground">Membros por grupo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros Únicos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableMembers.length}</div>
            <p className="text-xs text-muted-foreground">Total cadastrados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Life Groups</CardTitle>
                  <CardDescription>{filteredGroups.length} grupo(s) encontrado(s)</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Grupo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Life Group</DialogTitle>
                      <DialogDescription>Preencha os dados do novo grupo</DialogDescription>
                    </DialogHeader>
                    <GroupForm newGroup={newGroup} setNewGroup={setNewGroup} />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddGroup}>Criar Grupo</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Líder</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Membros</TableHead>
                    <TableHead>Reunião</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{group.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{group.leader}</p>
                          <p className="text-xs text-muted-foreground">{group.leaderContact}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(group.category)}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{group.memberIds.length} membros</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{group.meetingDay}</p>
                          <p className="text-xs text-muted-foreground">{group.meetingTime}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(group.status)}</TableCell>
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
                            <DropdownMenuItem onClick={() => setSelectedGroup(group)}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Ver Relatório
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteGroup(group.id)} className="text-destructive">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Grupos por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["jovens", "adultos", "idosos", "criancas", "casais", "mulheres", "homens"].map((category) => {
                    const count = lifeGroups.filter((g) => g.category === category).length
                    const percentage = lifeGroups.length > 0 ? (count / lifeGroups.length) * 100 : 0
                    if (count === 0) return null
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryBadge(category)}
                          <span className="text-sm text-muted-foreground">{count} grupo(s)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{Math.round(percentage)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Membros</CardTitle>
                <CardDescription>Membros por grupo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lifeGroups.map((group) => {
                    const member_count = group.memberIds.length
                    const percentage = total_members > 0 ? (member_count / total_members) * 100 : 0
                    return (
                      <div key={group.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate max-w-[150px]">{group.name}</span>
                          <span className="text-sm text-muted-foreground">{member_count} membros</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{Math.round(percentage)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Life Group</DialogTitle>
            <DialogDescription>Atualize os dados do grupo</DialogDescription>
          </DialogHeader>
          <GroupForm isEdit newGroup={newGroup} setNewGroup={setNewGroup} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateGroup}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Membros - {managingMembersGroup?.name}</DialogTitle>
            <DialogDescription>
              Adicione ou remova membros deste grupo. Total: {selectedMemberIds.length} membro(s)
            </DialogDescription>
          </DialogHeader>

          {/* Search and Sort Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  Data (mais antigo) {sortOption === "date-asc" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("date-desc")}>
                  Data (mais recente) {sortOption === "date-desc" && "✓"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="overflow-y-auto max-h-[50vh] space-y-4">
            {/* Current Members Section */}
            {currentMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users2 className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-primary">Membros do Grupo ({currentMembers.length})</h4>
                </div>
                <div className="space-y-2">
                  {currentMembers.map((member) => (
                    <MemberItem key={member.id} member={member} isCurrentMember={true} addMember={addMember} removeMember={removeMember} />
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            {currentMembers.length > 0 && nonMembers.length > 0 && (
              <div className="border-t border-border my-4" />
            )}

            {/* Non-Members Section */}
            {nonMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-muted-foreground">Outros Membros Disponíveis ({nonMembers.length})</h4>
                </div>
                <div className="space-y-2">
                  {nonMembers.map((member) => (
                    <MemberItem key={member.id} member={member} isCurrentMember={false} addMember={addMember} removeMember={removeMember} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {currentMembers.length === 0 && nonMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum membro encontrado com "{memberSearchTerm}"
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMembers}>
              Salvar ({selectedMemberIds.length} membros)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
