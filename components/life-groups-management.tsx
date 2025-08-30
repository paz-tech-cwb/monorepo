"use client"

import { useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Users2, User, BarChart3, Calendar } from "lucide-react"

interface LifeGroup {
  id: string
  name: string
  description: string
  leader: string
  leaderContact: string
  category: "jovens" | "adultos" | "idosos" | "criancas" | "casais"
  members: number
  maxMembers: number
  meetingDay: string
  meetingTime: string
  location: string
  status: "active" | "inactive"
  createdAt: string
}

const mockLifeGroups: LifeGroup[] = [
  {
    id: "1",
    name: "Jovens Unidos",
    description: "Grupo de jovens focado em crescimento espiritual",
    leader: "Carlos Silva",
    leaderContact: "(11) 99999-1111",
    category: "jovens",
    members: 15,
    maxMembers: 20,
    meetingDay: "Sexta-feira",
    meetingTime: "19:30",
    location: "Sala 1",
    status: "active",
    createdAt: "2023-01-15",
  },
  {
    id: "2",
    name: "Mulheres de Fé",
    description: "Grupo de mulheres para oração e estudo bíblico",
    leader: "Maria Santos",
    leaderContact: "(11) 99999-2222",
    category: "adultos",
    members: 12,
    maxMembers: 15,
    meetingDay: "Terça-feira",
    meetingTime: "14:00",
    location: "Sala 2",
    status: "active",
    createdAt: "2023-02-20",
  },
  {
    id: "3",
    name: "Homens de Valor",
    description: "Grupo masculino para discipulado",
    leader: "João Oliveira",
    leaderContact: "(11) 99999-3333",
    category: "adultos",
    members: 8,
    maxMembers: 12,
    meetingDay: "Sábado",
    meetingTime: "08:00",
    location: "Sala 3",
    status: "active",
    createdAt: "2023-03-10",
  },
  {
    id: "4",
    name: "Família Abençoada",
    description: "Grupo para casais e famílias",
    leader: "Pedro e Ana Costa",
    leaderContact: "(11) 99999-4444",
    category: "casais",
    members: 6,
    maxMembers: 10,
    meetingDay: "Domingo",
    meetingTime: "16:00",
    location: "Sala 4",
    status: "active",
    createdAt: "2023-04-05",
  },
]

export function LifeGroupsManagement() {
  const [lifeGroups, setLifeGroups] = useState<LifeGroup[]>(mockLifeGroups)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<LifeGroup | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<LifeGroup | null>(null)
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    leader: "",
    leaderContact: "",
    category: "adultos" as const,
    maxMembers: 15,
    meetingDay: "",
    meetingTime: "",
    location: "",
  })

  const filteredGroups = lifeGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.leader.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddGroup = () => {
    const group: LifeGroup = {
      id: Date.now().toString(),
      ...newGroup,
      members: 0,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    }
    setLifeGroups([...lifeGroups, group])
    setNewGroup({
      name: "",
      description: "",
      leader: "",
      leaderContact: "",
      category: "adultos",
      maxMembers: 15,
      meetingDay: "",
      meetingTime: "",
      location: "",
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
      maxMembers: group.maxMembers,
      meetingDay: group.meetingDay,
      meetingTime: group.meetingTime,
      location: group.location,
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
      maxMembers: 15,
      meetingDay: "",
      meetingTime: "",
      location: "",
    })
  }

  const handleDeleteGroup = (groupId: string) => {
    setLifeGroups(lifeGroups.filter((group) => group.id !== groupId))
  }

  const getCategoryBadge = (category: string) => {
    const variants = {
      jovens: { variant: "default" as const, text: "Jovens" },
      adultos: { variant: "secondary" as const, text: "Adultos" },
      idosos: { variant: "outline" as const, text: "Idosos" },
      criancas: { variant: "destructive" as const, text: "Crianças" },
      casais: { variant: "default" as const, text: "Casais" },
    }

    const config = variants[category as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Ativo" : "Inativo"}</Badge>
    )
  }

  const totalMembers = lifeGroups.reduce((sum, group) => sum + group.members, 0)
  const totalCapacity = lifeGroups.reduce((sum, group) => sum + group.maxMembers, 0)
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
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">de {totalCapacity} vagas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((totalMembers / totalCapacity) * 100)}%</div>
            <p className="text-xs text-muted-foreground">Capacidade utilizada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Grupo</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalMembers / lifeGroups.length)}</div>
            <p className="text-xs text-muted-foreground">Membros por grupo</p>
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
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Life Group</DialogTitle>
                      <DialogDescription>Preencha os dados do novo grupo</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="name">Nome do Grupo</Label>
                        <Input
                          id="name"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                          placeholder="Nome do grupo"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={newGroup.description}
                          onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                          placeholder="Descrição do grupo"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="leader">Líder</Label>
                        <Input
                          id="leader"
                          value={newGroup.leader}
                          onChange={(e) => setNewGroup({ ...newGroup, leader: e.target.value })}
                          placeholder="Nome do líder"
                        />
                      </div>
                      <div>
                        <Label htmlFor="leaderContact">Contato do Líder</Label>
                        <Input
                          id="leaderContact"
                          value={newGroup.leaderContact}
                          onChange={(e) => setNewGroup({ ...newGroup, leaderContact: e.target.value })}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Categoria</Label>
                        <select
                          id="category"
                          value={newGroup.category}
                          onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value as any })}
                          className="w-full p-2 border border-input rounded-md bg-background"
                        >
                          <option value="adultos">Adultos</option>
                          <option value="jovens">Jovens</option>
                          <option value="idosos">Idosos</option>
                          <option value="criancas">Crianças</option>
                          <option value="casais">Casais</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="maxMembers">Capacidade Máxima</Label>
                        <Input
                          id="maxMembers"
                          type="number"
                          value={newGroup.maxMembers}
                          onChange={(e) =>
                            setNewGroup({ ...newGroup, maxMembers: Number.parseInt(e.target.value) || 15 })
                          }
                          placeholder="15"
                        />
                      </div>
                      <div>
                        <Label htmlFor="meetingDay">Dia da Reunião</Label>
                        <Input
                          id="meetingDay"
                          value={newGroup.meetingDay}
                          onChange={(e) => setNewGroup({ ...newGroup, meetingDay: e.target.value })}
                          placeholder="Sexta-feira"
                        />
                      </div>
                      <div>
                        <Label htmlFor="meetingTime">Horário</Label>
                        <Input
                          id="meetingTime"
                          type="time"
                          value={newGroup.meetingTime}
                          onChange={(e) => setNewGroup({ ...newGroup, meetingTime: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="location">Local</Label>
                        <Input
                          id="location"
                          value={newGroup.location}
                          onChange={(e) => setNewGroup({ ...newGroup, location: e.target.value })}
                          placeholder="Sala 1"
                        />
                      </div>
                    </div>
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
                        <div>
                          <p className="text-sm font-medium">
                            {group.members}/{group.maxMembers}
                          </p>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{ width: `${(group.members / group.maxMembers) * 100}%` }}
                            ></div>
                          </div>
                        </div>
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
                <CardDescription>Número de grupos por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["jovens", "adultos", "idosos", "criancas", "casais"].map((category) => {
                    const count = lifeGroups.filter((group) => group.category === category).length
                    const percentage = (count / lifeGroups.length) * 100
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryBadge(category)}
                          <span className="text-sm">{count} grupos</span>
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
                <CardTitle>Crescimento Mensal</CardTitle>
                <CardDescription>Novos grupos criados por mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Janeiro 2023</span>
                    <Badge variant="outline">1 grupo</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fevereiro 2023</span>
                    <Badge variant="outline">1 grupo</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Março 2023</span>
                    <Badge variant="outline">1 grupo</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Abril 2023</span>
                    <Badge variant="outline">1 grupo</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Life Group</DialogTitle>
            <DialogDescription>Atualize os dados do grupo</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Nome do Grupo</Label>
              <Input
                id="edit-name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Nome do grupo"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder="Descrição do grupo"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-leader">Líder</Label>
              <Input
                id="edit-leader"
                value={newGroup.leader}
                onChange={(e) => setNewGroup({ ...newGroup, leader: e.target.value })}
                placeholder="Nome do líder"
              />
            </div>
            <div>
              <Label htmlFor="edit-leaderContact">Contato do Líder</Label>
              <Input
                id="edit-leaderContact"
                value={newGroup.leaderContact}
                onChange={(e) => setNewGroup({ ...newGroup, leaderContact: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <select
                id="edit-category"
                value={newGroup.category}
                onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value as any })}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="adultos">Adultos</option>
                <option value="jovens">Jovens</option>
                <option value="idosos">Idosos</option>
                <option value="criancas">Crianças</option>
                <option value="casais">Casais</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-maxMembers">Capacidade Máxima</Label>
              <Input
                id="edit-maxMembers"
                type="number"
                value={newGroup.maxMembers}
                onChange={(e) => setNewGroup({ ...newGroup, maxMembers: Number.parseInt(e.target.value) || 15 })}
                placeholder="15"
              />
            </div>
            <div>
              <Label htmlFor="edit-meetingDay">Dia da Reunião</Label>
              <Input
                id="edit-meetingDay"
                value={newGroup.meetingDay}
                onChange={(e) => setNewGroup({ ...newGroup, meetingDay: e.target.value })}
                placeholder="Sexta-feira"
              />
            </div>
            <div>
              <Label htmlFor="edit-meetingTime">Horário</Label>
              <Input
                id="edit-meetingTime"
                type="time"
                value={newGroup.meetingTime}
                onChange={(e) => setNewGroup({ ...newGroup, meetingTime: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-location">Local</Label>
              <Input
                id="edit-location"
                value={newGroup.location}
                onChange={(e) => setNewGroup({ ...newGroup, location: e.target.value })}
                placeholder="Sala 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateGroup}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
