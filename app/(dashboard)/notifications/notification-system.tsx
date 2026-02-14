"use client"

import { useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Mail, MessageSquare, Phone, Bell, Send, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react"
import { useNotifications, useSendNotification, useDeleteNotification } from "@/lib/hooks/use-notifications"
import { StatsCardSkeleton, TableSkeleton } from "@/components/ui/skeleton-components"
import type { Notification as NotificationItem } from "@/lib/api/types"

export function NotificationSystem() {
  const { data: notifications = [], isLoading, error } = useNotifications()
  const sendMutation = useSendNotification()
  const deleteMutation = useDeleteNotification()

  const [notification, setNotification] = useState({
    title: "",
    message: "",
    channels: [] as string[],
    target_audience: "all",
  })
  const [deletingNotificationId, setDeletingNotificationId] = useState<number | null>(null)

  const handleChannelChange = (channel: string, checked: boolean) => {
    if (checked) {
      setNotification({ ...notification, channels: [...notification.channels, channel] })
    } else {
      setNotification({ ...notification, channels: notification.channels.filter((c) => c !== channel) })
    }
  }

  const resetForm = () => {
    setNotification({ title: "", message: "", channels: [], target_audience: "all" })
  }

  const handleSendNotification = async () => {
    try {
      await sendMutation.mutateAsync({
        title: notification.title,
        message: notification.message,
        channels: notification.channels,
        target_audience: notification.target_audience,
      })
      toast.success("Notificacao enviada com sucesso!")
      resetForm()
    } catch {
      toast.error("Erro ao enviar notificacao. Tente novamente.")
    }
  }

  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Notificacao excluida com sucesso!")
    } catch {
      toast.error("Erro ao excluir notificacao. Tente novamente.")
    } finally {
      setDeletingNotificationId(null)
    }
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
    if (!config) return null
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.text}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm")
    } catch {
      return dateString
    }
  }

  const sentCount = notifications.filter((n: NotificationItem) => n.status === "sent").length
  const pendingCount = notifications.filter((n: NotificationItem) => n.status === "pending").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Enviar Notificacao</h1>
        <p className="text-muted-foreground">Envie notificacoes para os membros da igreja</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Notificacoes</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notifications.length}</div>
                <p className="text-xs text-muted-foreground">Notificacoes registradas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sentCount}</div>
                <p className="text-xs text-muted-foreground">Notificacoes enviadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">Notificacoes pendentes</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Enviar Notificacao</TabsTrigger>
          <TabsTrigger value="history">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Criar Notificacao</CardTitle>
                <CardDescription>Preencha os dados da notificacao</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Titulo</Label>
                  <Input
                    id="title"
                    value={notification.title}
                    onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                    placeholder="Titulo da notificacao"
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
                  <Label>Publico Alvo</Label>
                  <select
                    value={notification.target_audience}
                    onChange={(e) => setNotification({ ...notification, target_audience: e.target.value })}
                    className="w-full p-2 border border-input rounded-md bg-background mt-1"
                  >
                    <option value="all">Todos os membros</option>
                    <option value="active">Membros ativos</option>
                    <option value="youth">Jovens</option>
                    <option value="adults">Adultos</option>
                    <option value="leaders">Lideres</option>
                  </select>
                </div>

                <Button
                  onClick={handleSendNotification}
                  disabled={
                    !notification.title || !notification.message || notification.channels.length === 0 || sendMutation.isPending
                  }
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendMutation.isPending ? "Enviando..." : "Enviar Notificacao"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Canais de Envio</CardTitle>
                <CardDescription>Selecione os canais para enviar a notificacao</CardDescription>
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
              <CardTitle>Historico de Notificacoes</CardTitle>
              <CardDescription>Ultimas notificacoes enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton rows={5} columns={6} />
              ) : error ? (
                <p className="text-destructive">Erro ao carregar historico. Tente novamente mais tarde.</p>
              ) : notifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma notificacao encontrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titulo</TableHead>
                      <TableHead>Canais</TableHead>
                      <TableHead>Destinatarios</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead className="w-[70px]">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((item: NotificationItem) => (
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
                        <TableCell>{formatDate(item.sent_at)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingNotificationId(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingNotificationId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingNotificationId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta notificacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A notificacao sera removida permanentemente do historico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingNotificationId !== null) {
                  handleDeleteNotification(deletingNotificationId)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
