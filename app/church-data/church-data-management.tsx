"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
import { Building2, MapPin, Clock, CreditCard, Phone, Globe, Save, Plus, MoreHorizontal, Edit, Trash2, Search, DollarSign } from "lucide-react"
import {
  useContributions,
  useCreateContribution,
  useUpdateContribution,
  useDeleteContribution,
} from "@/lib/hooks/use-contributions"
import { StatsCardSkeleton, TableSkeleton } from "@/components/ui/skeleton-components"
import { Skeleton } from "@/components/ui/skeleton"
import type { Contribution, CreateContributionRequest, UpdateContributionRequest } from "@/lib/api/types"
import { AddressForm, type AddressFormData } from "@/components/ui/address-form"

interface ChurchData {
  name: string
  description: string
  address: {
    cep: string
    country: string
    state: string
    city: string
    street: string
    number: string
  }
  contact: {
    phone: string
    email: string
    website: string
  }
  schedule: {
    sunday: { morning: string; evening: string }
    wednesday: { evening: string }
    friday: { evening: string }
    saturday: { evening: string }
  }
  socialMedia: {
    facebook: string
    instagram: string
    youtube: string
    twitter: string
  }
}

const initialChurchData: ChurchData = {
  name: "Igreja Evangelica Esperanca",
  description: "Uma igreja comprometida com o amor de Deus e o servico a comunidade",
  address: {
    cep: "80410-000",
    country: "Brasil",
    state: "PR",
    city: "Curitiba",
    street: "Rua da Esperanca",
    number: "123",
  },
  contact: {
    phone: "(11) 3456-7890",
    email: "contato@igrejaesperanca.com.br",
    website: "www.igrejaesperanca.com.br",
  },
  schedule: {
    sunday: { morning: "10:00", evening: "19:00" },
    wednesday: { evening: "19:30" },
    friday: { evening: "19:30" },
    saturday: { evening: "19:00" },
  },
  socialMedia: {
    facebook: "facebook.com/igrejaesperanca",
    instagram: "@igrejaesperanca",
    youtube: "youtube.com/igrejaesperanca",
    twitter: "@igrejaesperanca",
  },
}

export function ChurchDataManagement() {
  const [churchData, setChurchData] = useState<ChurchData>(initialChurchData)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<string>("2024-01-15 14:30")

  // Contributions state and hooks
  const { data: contributions = [], isLoading: isLoadingContributions, error: contributionsError } = useContributions()
  const createMutation = useCreateContribution()
  const updateMutation = useUpdateContribution()
  const deleteMutation = useDeleteContribution()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null)
  const [contributionFormData, setContributionFormData] = useState<CreateContributionRequest>({
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

  const resetContributionForm = () => {
    setContributionFormData({
      bankName: "",
      branchNumber: "",
      accountNumber: "",
      pixKey: "",
    })
  }

  const handleAddContribution = async () => {
    await createMutation.mutateAsync(contributionFormData)
    resetContributionForm()
    setIsAddDialogOpen(false)
  }

  const handleEditContribution = (contribution: Contribution) => {
    setEditingContribution(contribution)
    setContributionFormData({
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
      data: contributionFormData as UpdateContributionRequest,
    })
    setEditingContribution(null)
    resetContributionForm()
  }

  const handleDeleteContribution = async (id: number) => {
    await deleteMutation.mutateAsync(id)
  }

  const handleSave = async () => {
    setIsLoading(true)
    // Simulate saving data
    setTimeout(() => {
      setIsLoading(false)
      setLastSaved(new Date().toLocaleString("pt-BR"))
      alert("Dados salvos com sucesso!")
    }, 1500)
  }

  const updateNestedData = (section: keyof ChurchData, subsection: string, field: string, value: string) => {
    setChurchData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [subsection]: {
          ...((prev[section] as Record<string, unknown>)[subsection] as Record<string, unknown>),
          [field]: value,
        },
      },
    }))
  }

  const updateAddressField = (field: string, value: string) => {
    setChurchData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }))
  }

  const updateContactField = (field: string, value: string) => {
    setChurchData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value,
      },
    }))
  }

  const updateSocialMediaField = (field: string, value: string) => {
    setChurchData((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [field]: value,
      },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dados da Igreja</h1>
          <p className="text-muted-foreground">Gerencie as informacoes da igreja</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Ultima atualizacao: <Badge variant="outline">{lastSaved}</Badge>
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Salvando..." : "Salvar Alteracoes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="banking">Bancario</TabsTrigger>
          <TabsTrigger value="schedule">Horarios</TabsTrigger>
          <TabsTrigger value="social">Redes Sociais</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informacoes Gerais
                </CardTitle>
                <CardDescription>Dados basicos da igreja</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Igreja</Label>
                  <Input
                    id="name"
                    value={churchData.name}
                    onChange={(e) => setChurchData({ ...churchData, name: e.target.value })}
                    placeholder="Nome da igreja"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descricao</Label>
                  <Textarea
                    id="description"
                    value={churchData.description}
                    onChange={(e) => setChurchData({ ...churchData, description: e.target.value })}
                    placeholder="Descricao da igreja"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereco
                </CardTitle>
                <CardDescription>Localizacao da igreja</CardDescription>
              </CardHeader>
              <CardContent>
                <AddressForm
                  value={churchData.address as AddressFormData}
                  onChange={(address) => setChurchData({ ...churchData, address })}
                  idPrefix="church-"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Informacoes de Contato
              </CardTitle>
              <CardDescription>Dados para contato com a igreja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={churchData.contact.phone}
                    onChange={(e) => updateContactField("phone", e.target.value)}
                    placeholder="(11) 3456-7890"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={churchData.contact.email}
                    onChange={(e) => updateContactField("email", e.target.value)}
                    placeholder="contato@igreja.com"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={churchData.contact.website}
                    onChange={(e) => updateContactField("website", e.target.value)}
                    placeholder="www.igreja.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          {/* Contribution Stats */}
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

          {/* Contributions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Contas Bancarias
                  </CardTitle>
                  <CardDescription>Informacoes para doacoes e transferencias</CardDescription>
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
                          value={contributionFormData.bankName}
                          onChange={(e) => setContributionFormData({ ...contributionFormData, bankName: e.target.value })}
                          placeholder="Ex: Banco do Brasil"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="branchNumber">Agencia</Label>
                          <Input
                            id="branchNumber"
                            value={contributionFormData.branchNumber}
                            onChange={(e) => setContributionFormData({ ...contributionFormData, branchNumber: e.target.value })}
                            placeholder="0001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="accountNumber">Conta</Label>
                          <Input
                            id="accountNumber"
                            value={contributionFormData.accountNumber}
                            onChange={(e) => setContributionFormData({ ...contributionFormData, accountNumber: e.target.value })}
                            placeholder="12345-6"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="pixKey">Chave PIX</Label>
                        <Input
                          id="pixKey"
                          value={contributionFormData.pixKey}
                          onChange={(e) => setContributionFormData({ ...contributionFormData, pixKey: e.target.value })}
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
              {isLoadingContributions ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-[250px]" />
                  <TableSkeleton rows={5} columns={5} />
                </div>
              ) : contributionsError ? (
                <p className="text-destructive">Erro ao carregar contas. Tente novamente mais tarde.</p>
              ) : (
                <>
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
                </>
              )}
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
                    value={contributionFormData.bankName}
                    onChange={(e) => setContributionFormData({ ...contributionFormData, bankName: e.target.value })}
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-branchNumber">Agencia</Label>
                    <Input
                      id="edit-branchNumber"
                      value={contributionFormData.branchNumber}
                      onChange={(e) => setContributionFormData({ ...contributionFormData, branchNumber: e.target.value })}
                      placeholder="0001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-accountNumber">Conta</Label>
                    <Input
                      id="edit-accountNumber"
                      value={contributionFormData.accountNumber}
                      onChange={(e) => setContributionFormData({ ...contributionFormData, accountNumber: e.target.value })}
                      placeholder="12345-6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-pixKey">Chave PIX</Label>
                  <Input
                    id="edit-pixKey"
                    value={contributionFormData.pixKey}
                    onChange={(e) => setContributionFormData({ ...contributionFormData, pixKey: e.target.value })}
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
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horarios de Funcionamento
              </CardTitle>
              <CardDescription>Horarios dos cultos e atividades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Domingo</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input
                      type="time"
                      value={churchData.schedule.sunday.morning}
                      onChange={(e) => updateNestedData("schedule", "sunday", "morning", e.target.value)}
                      placeholder="Manha"
                    />
                    <Input
                      type="time"
                      value={churchData.schedule.sunday.evening}
                      onChange={(e) => updateNestedData("schedule", "sunday", "evening", e.target.value)}
                      placeholder="Noite"
                    />
                  </div>
                </div>
                <div>
                  <Label>Quarta-feira</Label>
                  <Input
                    type="time"
                    value={churchData.schedule.wednesday.evening}
                    onChange={(e) => updateNestedData("schedule", "wednesday", "evening", e.target.value)}
                    placeholder="Noite"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Sexta-feira</Label>
                  <Input
                    type="time"
                    value={churchData.schedule.friday.evening}
                    onChange={(e) => updateNestedData("schedule", "friday", "evening", e.target.value)}
                    placeholder="Noite"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Sabado</Label>
                  <Input
                    type="time"
                    value={churchData.schedule.saturday.evening}
                    onChange={(e) => updateNestedData("schedule", "saturday", "evening", e.target.value)}
                    placeholder="Noite"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Redes Sociais
              </CardTitle>
              <CardDescription>Links das redes sociais da igreja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={churchData.socialMedia.facebook}
                    onChange={(e) => updateSocialMediaField("facebook", e.target.value)}
                    placeholder="facebook.com/igreja"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={churchData.socialMedia.instagram}
                    onChange={(e) => updateSocialMediaField("instagram", e.target.value)}
                    placeholder="@igreja"
                  />
                </div>
                <div>
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input
                    id="youtube"
                    value={churchData.socialMedia.youtube}
                    onChange={(e) => updateSocialMediaField("youtube", e.target.value)}
                    placeholder="youtube.com/igreja"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={churchData.socialMedia.twitter}
                    onChange={(e) => updateSocialMediaField("twitter", e.target.value)}
                    placeholder="@igreja"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
