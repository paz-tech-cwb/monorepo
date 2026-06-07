"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Search, Plus, MoreHorizontal, Edit, Trash2, DollarSign, Building2, CreditCard } from "lucide-react"
import {
  useContributions,
  useCreateContribution,
  useUpdateContribution,
  useDeleteContribution,
} from "@/lib/hooks/use-contributions"
import { StatsCardSkeleton, TableSkeleton } from "@/components/ui/skeleton-components"
import { Skeleton } from "@/components/ui/skeleton"
import type { Contribution, CreateContributionRequest, UpdateContributionRequest } from "@/lib/api/types"

export function ContributionsManagement() {
  const { data: contributions = [], isLoading, error } = useContributions()
  const createMutation = useCreateContribution()
  const updateMutation = useUpdateContribution()
  const deleteMutation = useDeleteContribution()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null)
  const [deletingContributionId, setDeletingContributionId] = useState<number | null>(null)
  const [periodTab, setPeriodTab] = useState<"all" | "month" | "year">("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [formData, setFormData] = useState<CreateContributionRequest>({
    bank_name: "",
    branch_number: "",
    account_number: "",
    pix_key: "",
  })

  const filteredContributions = contributions.filter(
    (contribution) =>
      contribution.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contribution.pix_key ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      bank_name: "",
      branch_number: "",
      account_number: "",
      pix_key: "",
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
      bank_name: contribution.bank_name,
      branch_number: contribution.branch_number,
      account_number: contribution.account_number,
      pix_key: contribution.pix_key ?? "",
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
    setDeletingContributionId(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Contribuicoes</h1>
          <p className="text-muted-foreground">Carregando contribuicoes...</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-[180px] mb-2" />
                <Skeleton className="h-4 w-[220px]" />
              </div>
              <Skeleton className="h-10 w-[140px]" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-[250px] mb-4" />
            <TableSkeleton rows={5} columns={5} />
          </CardContent>
        </Card>
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
              {new Set(contributions.map((c) => c.bank_name)).size}
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
              {contributions.filter((c) => c.pix_key).length}
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
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Conta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Tabs value={periodTab} onValueChange={(v) => setPeriodTab(v as typeof periodTab)}>
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="month">Este mês</TabsTrigger>
                  <TabsTrigger value="year">Este ano</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-fit">
                  Filtros avançados
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="filter-bank">Banco</Label>
                    <Input id="filter-bank" placeholder="Nome do banco..." />
                  </div>
                  <div>
                    <Label htmlFor="filter-pix">Chave PIX</Label>
                    <Input id="filter-pix" placeholder="Filtrar por chave PIX..." />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
                  <TableCell className="font-medium">{contribution.bank_name}</TableCell>
                  <TableCell>{contribution.branch_number}</TableCell>
                  <TableCell>{contribution.account_number}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {contribution.pix_key || "—"}
                    </Badge>
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
                          onClick={() => setDeletingContributionId(contribution.id)}
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

      {/* Add Contribution Drawer */}
      <FormDrawer
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Registrar Contribuição"
        description="Preencha os dados da conta bancaria"
        isLoading={createMutation.isPending}
        onSubmit={handleAddContribution}
        submitLabel="Adicionar Conta"
      >
        <div className="grid gap-4">
          <div>
            <Label htmlFor="bank_name">Nome do Banco</Label>
            <Input
              id="bank_name"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="Ex: Banco do Brasil"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="branch_number">Agencia</Label>
              <Input
                id="branch_number"
                value={formData.branch_number}
                onChange={(e) => setFormData({ ...formData, branch_number: e.target.value })}
                placeholder="0001"
              />
            </div>
            <div>
              <Label htmlFor="account_number">Conta</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="12345-6"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pix_key">Chave PIX</Label>
            <Input
              id="pix_key"
              value={formData.pix_key}
              onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
              placeholder="email@exemplo.com ou CPF/CNPJ"
            />
          </div>
        </div>
      </FormDrawer>

      {/* Edit Contribution Drawer */}
      <FormDrawer
        open={!!editingContribution}
        onOpenChange={(open) => { if (!open) { setEditingContribution(null); resetForm() } }}
        title="Editar Conta"
        description="Atualize os dados da conta bancaria"
        isLoading={updateMutation.isPending}
        onSubmit={handleUpdateContribution}
        submitLabel="Salvar"
      >
        <div className="grid gap-4">
          <div>
            <Label htmlFor="edit-bank_name">Nome do Banco</Label>
            <Input
              id="edit-bank_name"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="Ex: Banco do Brasil"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-branch_number">Agencia</Label>
              <Input
                id="edit-branch_number"
                value={formData.branch_number}
                onChange={(e) => setFormData({ ...formData, branch_number: e.target.value })}
                placeholder="0001"
              />
            </div>
            <div>
              <Label htmlFor="edit-account_number">Conta</Label>
              <Input
                id="edit-account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="12345-6"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-pix_key">Chave PIX</Label>
            <Input
              id="edit-pix_key"
              value={formData.pix_key}
              onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
              placeholder="email@exemplo.com ou CPF/CNPJ"
            />
          </div>
        </div>
      </FormDrawer>

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={deletingContributionId !== null}
        onOpenChange={(open) => { if (!open) setDeletingContributionId(null) }}
        entityName="esta contribuição"
        onConfirm={() => { if (deletingContributionId !== null) handleDeleteContribution(deletingContributionId) }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
