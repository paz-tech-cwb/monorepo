"use client"

import { useState } from "react"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react"

interface Member {
  id: string
  name: string
  email: string
  phone: string
  address: string
  birthDate: string
  membershipDate: string
  lifeGroup: string
  status: "active" | "inactive"
}

const mockMembers: Member[] = [
  {
    id: "1",
    name: "Carlos Mendes",
    email: "carlos@email.com",
    phone: "(11) 99999-9999",
    address: "Rua das Flores, 123",
    birthDate: "1985-03-15",
    membershipDate: "2020-01-10",
    lifeGroup: "Jovens Unidos",
    status: "active",
  },
  {
    id: "2",
    name: "Fernanda Lima",
    email: "fernanda@email.com",
    phone: "(11) 88888-8888",
    address: "Av. Principal, 456",
    birthDate: "1990-07-22",
    membershipDate: "2021-05-15",
    lifeGroup: "Mulheres de Fé",
    status: "active",
  },
  {
    id: "3",
    name: "Roberto Santos",
    email: "roberto@email.com",
    phone: "(11) 77777-7777",
    address: "Rua da Igreja, 789",
    birthDate: "1975-12-08",
    membershipDate: "2019-03-20",
    lifeGroup: "Homens de Valor",
    status: "inactive",
  },
  {
    id: "4",
    name: "Lucia Ferreira",
    email: "lucia@email.com",
    phone: "(11) 66666-6666",
    address: "Rua da Paz, 321",
    birthDate: "1982-09-14",
    membershipDate: "2022-08-05",
    lifeGroup: "Família Abençoada",
    status: "active",
  },
]

export function MembersManagement() {
  const [members, setMembers] = useState<Member[]>(mockMembers)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    birthDate: "",
    lifeGroup: "",
  })

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lifeGroup.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddMember = () => {
    const member: Member = {
      id: Date.now().toString(),
      ...newMember,
      membershipDate: new Date().toISOString().split("T")[0],
      status: "active",
    }
    setMembers([...members, member])
    setNewMember({ name: "", email: "", phone: "", address: "", birthDate: "", lifeGroup: "" })
    setIsAddDialogOpen(false)
  }

  const handleEditMember = (member: Member) => {
    setEditingMember(member)
    setNewMember({
      name: member.name,
      email: member.email,
      phone: member.phone,
      address: member.address,
      birthDate: member.birthDate,
      lifeGroup: member.lifeGroup,
    })
  }

  const handleUpdateMember = () => {
    if (!editingMember) return

    setMembers(members.map((member) => (member.id === editingMember.id ? { ...member, ...newMember } : member)))
    setEditingMember(null)
    setNewMember({ name: "", email: "", phone: "", address: "", birthDate: "", lifeGroup: "" })
  }

  const handleDeleteMember = (memberId: string) => {
    setMembers(members.filter((member) => member.id !== memberId))
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Ativo" : "Inativo"}</Badge>
    )
  }

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
              <CardDescription>{filteredMembers.length} membro(s) encontrado(s)</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Membro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Membro</DialogTitle>
                  <DialogDescription>Preencha os dados do novo membro</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={newMember.birthDate}
                      onChange={(e) => setNewMember({ ...newMember, birthDate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={newMember.address}
                      onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="lifeGroup">Life Group</Label>
                    <Input
                      id="lifeGroup"
                      value={newMember.lifeGroup}
                      onChange={(e) => setNewMember({ ...newMember, lifeGroup: e.target.value })}
                      placeholder="Nome do Life Group"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddMember}>Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Life Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Membro desde</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>{member.lifeGroup}</TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell>{member.membershipDate}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditMember(member)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteMember(member.id)} className="text-destructive">
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

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>Atualize os dados do membro</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={newMember.birthDate}
                onChange={(e) => setNewMember({ ...newMember, birthDate: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-address">Endereço</Label>
              <Input
                id="edit-address"
                value={newMember.address}
                onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-lifeGroup">Life Group</Label>
              <Input
                id="edit-lifeGroup"
                value={newMember.lifeGroup}
                onChange={(e) => setNewMember({ ...newMember, lifeGroup: e.target.value })}
                placeholder="Nome do Life Group"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateMember}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
