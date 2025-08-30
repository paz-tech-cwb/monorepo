"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, Clock, CreditCard, Phone, Globe, Save } from "lucide-react"

interface ChurchData {
  name: string
  description: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  contact: {
    phone: string
    email: string
    website: string
  }
  bankDetails: {
    bankName: string
    accountNumber: string
    routingNumber: string
    accountHolder: string
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
  name: "Igreja Evangélica Esperança",
  description: "Uma igreja comprometida com o amor de Deus e o serviço à comunidade",
  address: {
    street: "Rua da Esperança, 123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567",
    country: "Brasil",
  },
  contact: {
    phone: "(11) 3456-7890",
    email: "contato@igrejaesperanca.com.br",
    website: "www.igrejaesperanca.com.br",
  },
  bankDetails: {
    bankName: "Banco do Brasil",
    accountNumber: "12345-6",
    routingNumber: "001",
    accountHolder: "Igreja Evangélica Esperança",
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

  const handleSave = async () => {
    setIsLoading(true)
    // Simulate saving data
    setTimeout(() => {
      setIsLoading(false)
      setLastSaved(new Date().toLocaleString("pt-BR"))
      alert("Dados salvos com sucesso!")
    }, 1500)
  }

  const updateChurchData = (section: keyof ChurchData, field: string, value: string) => {
    setChurchData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const updateNestedData = (section: keyof ChurchData, subsection: string, field: string, value: string) => {
    setChurchData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...(prev[section] as any)[subsection],
          [field]: value,
        },
      },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dados da Igreja</h1>
          <p className="text-muted-foreground">Gerencie as informações da igreja</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Última atualização: <Badge variant="outline">{lastSaved}</Badge>
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="banking">Bancário</TabsTrigger>
          <TabsTrigger value="schedule">Horários</TabsTrigger>
          <TabsTrigger value="social">Redes Sociais</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informações Gerais
                </CardTitle>
                <CardDescription>Dados básicos da igreja</CardDescription>
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
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={churchData.description}
                    onChange={(e) => setChurchData({ ...churchData, description: e.target.value })}
                    placeholder="Descrição da igreja"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço
                </CardTitle>
                <CardDescription>Localização da igreja</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street">Endereço</Label>
                  <Input
                    id="street"
                    value={churchData.address.street}
                    onChange={(e) => updateNestedData("address", "street", "street", e.target.value)}
                    placeholder="Rua, número"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={churchData.address.city}
                      onChange={(e) => updateNestedData("address", "city", "city", e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={churchData.address.state}
                      onChange={(e) => updateNestedData("address", "state", "state", e.target.value)}
                      placeholder="Estado"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={churchData.address.zipCode}
                      onChange={(e) => updateNestedData("address", "zipCode", "zipCode", e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      value={churchData.address.country}
                      onChange={(e) => updateNestedData("address", "country", "country", e.target.value)}
                      placeholder="País"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Informações de Contato
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
                    onChange={(e) => updateNestedData("contact", "phone", "phone", e.target.value)}
                    placeholder="(11) 3456-7890"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={churchData.contact.email}
                    onChange={(e) => updateNestedData("contact", "email", "email", e.target.value)}
                    placeholder="contato@igreja.com"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={churchData.contact.website}
                    onChange={(e) => updateNestedData("contact", "website", "website", e.target.value)}
                    placeholder="www.igreja.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Dados Bancários
              </CardTitle>
              <CardDescription>Informações para doações e transferências</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="bankName">Nome do Banco</Label>
                  <Input
                    id="bankName"
                    value={churchData.bankDetails.bankName}
                    onChange={(e) => updateNestedData("bankDetails", "bankName", "bankName", e.target.value)}
                    placeholder="Nome do banco"
                  />
                </div>
                <div>
                  <Label htmlFor="accountHolder">Titular da Conta</Label>
                  <Input
                    id="accountHolder"
                    value={churchData.bankDetails.accountHolder}
                    onChange={(e) => updateNestedData("bankDetails", "accountHolder", "accountHolder", e.target.value)}
                    placeholder="Nome do titular"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Número da Conta</Label>
                  <Input
                    id="accountNumber"
                    value={churchData.bankDetails.accountNumber}
                    onChange={(e) => updateNestedData("bankDetails", "accountNumber", "accountNumber", e.target.value)}
                    placeholder="12345-6"
                  />
                </div>
                <div>
                  <Label htmlFor="routingNumber">Código do Banco</Label>
                  <Input
                    id="routingNumber"
                    value={churchData.bankDetails.routingNumber}
                    onChange={(e) => updateNestedData("bankDetails", "routingNumber", "routingNumber", e.target.value)}
                    placeholder="001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Funcionamento
              </CardTitle>
              <CardDescription>Horários dos cultos e atividades</CardDescription>
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
                      placeholder="Manhã"
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
                  <Label>Sábado</Label>
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
                    onChange={(e) => updateNestedData("socialMedia", "facebook", "facebook", e.target.value)}
                    placeholder="facebook.com/igreja"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={churchData.socialMedia.instagram}
                    onChange={(e) => updateNestedData("socialMedia", "instagram", "instagram", e.target.value)}
                    placeholder="@igreja"
                  />
                </div>
                <div>
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input
                    id="youtube"
                    value={churchData.socialMedia.youtube}
                    onChange={(e) => updateNestedData("socialMedia", "youtube", "youtube", e.target.value)}
                    placeholder="youtube.com/igreja"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={churchData.socialMedia.twitter}
                    onChange={(e) => updateNestedData("socialMedia", "twitter", "twitter", e.target.value)}
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
