"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import { Search, MessageCircle, Send } from "lucide-react"
import { useGuests } from "@/lib/hooks/use-guests"
import { useAuthContext } from "@/contexts/auth-context"
import { formatPhoneBR } from "@/lib/utils/phone"
import { whatsAppChatUrl } from "@/lib/utils/whatsapp"
import { GuestPushDialog } from "./guest-push-dialog"
import type { Guest } from "@/lib/api/types"

// Only these roles are allowed to POST /api/notifications on the backend
// (see notifications.controller.ts's @Roles decorator) — leadership roles
// that can see the guests list but can't send push notifications must have
// the send button hidden rather than erroring on click.
const NOTIFICATION_SENDER_ROLES = new Set(["admin", "pastor"])

function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "-"
  const digits = phone.replace(/\D/g, "")
  const local = digits.startsWith("55") ? digits.slice(2) : digits
  return formatPhoneBR(local) || phone
}

export function GuestsManagement() {
  const { user } = useAuthContext()
  const { data: guests = [], isLoading, error } = useGuests()
  const [searchTerm, setSearchTerm] = useState("")
  const [pushGuest, setPushGuest] = useState<Guest | null>(null)

  const canSendNotifications = !!user?.role && NOTIFICATION_SENDER_ROLES.has(user.role)

  const filteredGuests = guests.filter((guest) => {
    const term = searchTerm.toLowerCase()
    return (
      guest.name.toLowerCase().includes(term) ||
      (guest.email ?? "").toLowerCase().includes(term) ||
      (guest.phone ?? "").toLowerCase().includes(term)
    )
  })

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Convidados</h1>
        <p className="text-muted-foreground">Acompanhe os convidados e seu progresso rumo a se tornarem membros</p>
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Lista de Convidados</CardTitle>
              <CardDescription>{filteredGuests.length} convidado(s) encontrado(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          <div className="mb-4 flex min-w-0 items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar convidados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-0 max-w-sm"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : error ? (
            <p className="text-destructive text-center py-8">Erro ao carregar convidados. Tente novamente mais tarde.</p>
          ) : filteredGuests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum convidado encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Convidado há</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest) => {
                  const chatUrl = whatsAppChatUrl(guest.phone)
                  return (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={guest.picture ?? undefined} alt={guest.name} />
                            <AvatarFallback>
                              {guest.name
                                .split(" ")
                                .filter(Boolean)
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{guest.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPhoneDisplay(guest.phone)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Convidado há {guest.days_as_guest} dias</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[140px] items-center gap-2">
                          <Progress value={guest.progress.progress_percentage} className="w-24" />
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {guest.progress.progress_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={!chatUrl}
                            asChild={!!chatUrl}
                            title={chatUrl ? "Conversar no WhatsApp" : "Telefone indisponível"}
                          >
                            {chatUrl ? (
                              <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            ) : (
                              <MessageCircle className="h-4 w-4" />
                            )}
                          </Button>
                          {canSendNotifications && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Enviar notificação"
                              onClick={() => setPushGuest(guest)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GuestPushDialog
        guest={pushGuest}
        open={pushGuest !== null}
        onOpenChange={(open) => { if (!open) setPushGuest(null) }}
      />
    </div>
  )
}
