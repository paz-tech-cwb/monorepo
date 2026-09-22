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
import { useLeads } from "@/lib/hooks/use-leads"
import { useAuthContext } from "@/contexts/auth-context"
import { formatPhoneBR } from "@/lib/utils/phone"
import { whatsAppChatUrl } from "@/lib/utils/whatsapp"
import { LeadPushDialog } from "./lead-push-dialog"
import type { Lead } from "@/lib/api/types"

// Only these roles are allowed to POST /api/notifications on the backend
// (see notifications.controller.ts's @Roles decorator) — leadership roles
// that can see the leads list but can't send push notifications must have
// the send button hidden rather than erroring on click.
const NOTIFICATION_SENDER_ROLES = new Set(["admin", "pastor"])

function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "-"
  const digits = phone.replace(/\D/g, "")
  const local = digits.startsWith("55") ? digits.slice(2) : digits
  return formatPhoneBR(local) || phone
}

export function LeadsManagement() {
  const { user } = useAuthContext()
  const { data: leads = [], isLoading, error } = useLeads()
  const [searchTerm, setSearchTerm] = useState("")
  const [pushLead, setPushLead] = useState<Lead | null>(null)

  const canSendNotifications = !!user?.role && NOTIFICATION_SENDER_ROLES.has(user.role)

  const filteredLeads = leads.filter((lead) => {
    const term = searchTerm.toLowerCase()
    return (
      lead.name.toLowerCase().includes(term) ||
      (lead.email ?? "").toLowerCase().includes(term) ||
      (lead.phone ?? "").toLowerCase().includes(term)
    )
  })

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Leads</h1>
        <p className="text-muted-foreground">Acompanhe os leads e seu progresso rumo a se tornarem membros</p>
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Lista de Leads</CardTitle>
              <CardDescription>{filteredLeads.length} lead(s) encontrado(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          <div className="mb-4 flex min-w-0 items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-0 max-w-sm"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : error ? (
            <p className="text-destructive text-center py-8">Erro ao carregar leads. Tente novamente mais tarde.</p>
          ) : filteredLeads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum lead encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Lead há</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const chatUrl = whatsAppChatUrl(lead.phone)
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={lead.picture ?? undefined} alt={lead.name} />
                            <AvatarFallback>
                              {lead.name
                                .split(" ")
                                .filter(Boolean)
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{lead.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPhoneDisplay(lead.phone)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Lead há {lead.days_as_lead} dias</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[140px] items-center gap-2">
                          <Progress value={lead.progress.progress_percentage} className="w-24" />
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {lead.progress.progress_percentage}%
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
                              onClick={() => setPushLead(lead)}
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

      <LeadPushDialog
        lead={pushLead}
        open={pushLead !== null}
        onOpenChange={(open) => { if (!open) setPushLead(null) }}
      />
    </div>
  )
}
