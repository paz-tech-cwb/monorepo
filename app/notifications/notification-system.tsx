"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mail, MessageSquare, Phone, Bell, Send, Clock, CheckCircle, XCircle } from "lucide-react"

interface NotificationHistory {
  id: string
  title: string
  message: string
  channels: string[]
  recipients: number
  status: "sent" | "pending" | "failed"
  sentAt: string
}

const mockHistory: NotificationHistory[] = [
  {
    id: "1",
    title: "Lembrete do Culto Dominical",
    message: "Não esqueça do culto de domingo às 10h!",
    channels: ["push", "email"],
    recipients: 856,
    status: "sent",
    sentAt: "2024-01-15 08:00",
  },
  {
    id: "2",
    title: "Reunião de Oração",
    message: "Reunião de oração hoje às 19h30",
    channels: ["sms", "whatsapp"],
    recipients: 234,
    status: "sent",
    sentAt: "2024-01-14 17:00",
  },
  {
    id: "3",
    title: "Retiro de Jovens",
    message: "Inscrições abertas para o retiro de jovens",
    channels: ["push", "email", "sms"],
    recipients: 156,
    status: "pending",
    sentAt: "2024-01-13 14:30",
  },
]

export function NotificationSystem() {
  const [notification, setNotification] = useState({
    title: "",
    message: "",
    channels: [] as string[],
    targetAudience: "all",
  })
  const [history] = useState<NotificationHistory[]>(mockHistory)
  const [isLoading, setIsLoading] = useState(false)

  const handleChannelChange = (channel: string, checked: boolean) => {
    if (checked) {
      setNotification({ ...notification, channels: [...notification.channels, channel] })
    } else {
      setNotification({ ...notification, channels: notification.channels.filter((c) => c !== channel) })
    }
  }

  const handleSendNotification = async () => {
    setIsLoading(true)
    // Simulate sending notification
    setTimeout(() => {
      setIsLoading(false)
      setNotification({ title: "", message: "", channels: [], targetAudience: "all" })
      alert("Notificação enviada com sucesso!")
    }, 2000)
  }

  const getChannelIcon = (channel: string) => {
    const icons = {
      email: <Mail className="h-4 w-4" />,
      sms: <Phone className="h-4 w-4" />,
      whatsapp: <MessageSquare className="h-4 w-4" />,
      push: <Bell className="h-4 w-4" />,
    }
    return icons[channel as keyof typeof icons]
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: { variant: "default" as const, icon: <CheckCircle className="h-3 w-3" />, text: "Enviado" },
      pending: { variant: "secondary" as const, icon: <Clock className="h-3 w-3" />, text: "Pendente" },
      failed: { variant: "destructive" as const, icon: <XCircle className="h-3 w-3" />, text: "Falhou" },
    }

    const config = variants[status as keyof typeof variants]
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.text}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Enviar Notificação</h1>
        <p className="text-muted-foreground">Envie notificações para os membros da igreja</p>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Enviar Notificação</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Criar Notificação</CardTitle>
                <CardDescription>Preencha os dados da notificação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={notification.title}
                    onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                    placeholder="Título da notificação"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    value={notification.message}
                    onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                    placeholder="Digite sua mensagem aqui..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Público Alvo</Label>
                  <select
                    value={notification.targetAudience}
                    onChange={(e) => setNotification({ ...notification, targetAudience: e.target.value })}
                    className="w-full p-2 border border-input rounded-md bg-background mt-1"
                  >
                    <option value="all">Todos os membros</option>
                    <option value="active">Membros ativos</option>
                    <option value="youth">Jovens</option>
                    <option value="adults">Adultos</option>
                    <option value="leaders">Líderes</option>
                  </select>
                </div>

                <Button
                  onClick={handleSendNotification}
                  disabled={
                    !notification.title || !notification.message || notification.channels.length === 0 || isLoading
                  }
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isLoading ? "Enviando..." : "Enviar Notificação"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Canais de Envio</CardTitle>
                <CardDescription>Selecione os canais para enviar a notificação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email"
                      checked={notification.channels.includes("email")}
                      onCheckedChange={(checked) => handleChannelChange("email", checked as boolean)}
                    />
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sms"
                      checked={notification.channels.includes("sms")}
                      onCheckedChange={(checked) => handleChannelChange("sms", checked as boolean)}
                    />
                    <Label htmlFor="sms" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      SMS
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="whatsapp"
                      checked={notification.channels.includes("whatsapp")}
                      onCheckedChange={(checked) => handleChannelChange("whatsapp", checked as boolean)}
                    />
                    <Label htmlFor="whatsapp" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="push"
                      checked={notification.channels.includes("push")}
                      onCheckedChange={(checked) => handleChannelChange("push", checked as boolean)}
                    />
                    <Label htmlFor="push" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Push Notification
                    </Label>
                  </div>
                </div>

                {notification.channels.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Canais selecionados:</p>
                    <div className="flex flex-wrap gap-2">
                      {notification.channels.map((channel) => (
                        <Badge key={channel} variant="secondary" className="flex items-center gap-1">
                          {getChannelIcon(channel)}
                          {channel.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Notificações</CardTitle>
              <CardDescription>Últimas notificações enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Canais</TableHead>
                    <TableHead>Destinatários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{item.message}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.channels.map((channel) => (
                            <Badge key={channel} variant="outline" className="flex items-center gap-1">
                              {getChannelIcon(channel)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{item.recipients}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{item.sentAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
