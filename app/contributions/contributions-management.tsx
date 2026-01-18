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
import { Search, Plus, MoreHorizontal, Edit, Trash2, DollarSign, Building2, CreditCard } from "lucide-react"
import {
  useContributions,
  useCreateContribution,
  useUpdateContribution,
  useDeleteContribution,
} from "@/lib/hooks/use-contributions"
import type { Contribution, CreateContributionRequest, UpdateContributionRequest } from "@/lib/api/types"

export function ContributionsManagement() {
  const { data: contributions = [], isLoading, error } = useContributions()
  const createMutation = useCreateContribution()
  const updateMutation = useUpdateContribution()
  const deleteMutation = useDeleteContribution()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null)
  const [formData, setFormData] = useState<CreateContributionRequest>({
    bankName: "",
    branchNumber: "",
    accountNumber: "",
    pixKey: "",
  })

  const filteredContributions = contributions.filter(
    (contribution) =>
      contribution.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contribution.pixKey.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      bankName: "",
      branchNumber: "",
      accountNumber: "",
      pixKey: "",
    })
  }

  const handleAddContribution = async () => {
    await createMutation.mutateAsync(formData)
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditContribution = (contribution: Contribution) => {
    setEditingContribution(contribution)
    setFormData({
      bankName: contribution.bankName,
      branchNumber: contribution.branchNumber,
      accountNumber: contribution.accountNumber,
      pixKey: contribution.pixKey,
    })
  }

  const handleUpdateContribution = async () => {
    if (!editingContribution) return

    await updateMutation.mutateAsync({
      id: editingContribution.id,
      data: formData as UpdateContributionRequest,
    })
    setEditingContribution(null)
    resetForm()
  }

  const handleDeleteContribution = async (id: number) => {
    await deleteMutation.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Contribuicoes</h1>
          <p className="text-muted-foreground">Carregando contribuicoes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Contribuicoes</h1>
          <p className="text-destructive">Erro ao carregar contribuicoes. Tente novamente mais tarde.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Contribuicoes</h1>
        <p className="text-muted-foreground">Configure as contas bancarias para contribuicoes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contributions.length}</div>
            <p className="text-xs text-muted-foreground">Contas cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bancos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(contributions.map((c) => c.bankName)).size}
            </div>
            <p className="text-xs text-muted-foreground">Bancos diferentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com PIX</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contributions.filter((c) => c.pixKey).length}
            </div>
            <p className="text-xs text-muted-foreground">Contas com chave PIX</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Contas</CardTitle>
              <CardDescription>{filteredContributions.length} conta(s) encontrada(s)</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Conta</DialogTitle>
                  <DialogDescription>Preencha os dados da conta bancaria</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="bankName">Nome do Banco</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Ex: Banco do Brasil"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branchNumber">Agencia</Label>
                      <Input
                        id="branchNumber"
                        value={formData.branchNumber}
                        onChange={(e) => setFormData({ ...formData, branchNumber: e.target.value })}
                        placeholder="0001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Conta</Label>
                      <Input
                        id="accountNumber"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        placeholder="12345-6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="pixKey">Chave PIX</Label>
                    <Input
                      id="pixKey"
                      value={formData.pixKey}
                      onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                      placeholder="email@exemplo.com ou CPF/CNPJ"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddContribution} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adicionando..." : "Adicionar Conta"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Chave PIX</TableHead>
                <TableHead className="w-[70px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContributions.map((contribution) => (
                <TableRow key={contribution.id}>
                  <TableCell className="font-medium">{contribution.bankName}</TableCell>
                  <TableCell>{contribution.branchNumber}</TableCell>
                  <TableCell>{contribution.accountNumber}</TableCell>
                  <TableCell>
                    <span className="truncate max-w-xs block">{contribution.pixKey}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditContribution(contribution)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteContribution(contribution.id)}
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
        </CardContent>
      </Card>

      {/* Edit Contribution Dialog */}
      <Dialog open={!!editingContribution} onOpenChange={() => setEditingContribution(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>Atualize os dados da conta bancaria</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="edit-bankName">Nome do Banco</Label>
              <Input
                id="edit-bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="Ex: Banco do Brasil"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-branchNumber">Agencia</Label>
                <Input
                  id="edit-branchNumber"
                  value={formData.branchNumber}
                  onChange={(e) => setFormData({ ...formData, branchNumber: e.target.value })}
                  placeholder="0001"
                />
              </div>
              <div>
                <Label htmlFor="edit-accountNumber">Conta</Label>
                <Input
                  id="edit-accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="12345-6"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-pixKey">Chave PIX</Label>
              <Input
                id="edit-pixKey"
                value={formData.pixKey}
                onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                placeholder="email@exemplo.com ou CPF/CNPJ"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContribution(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateContribution} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
