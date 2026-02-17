"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Bell, X, ArrowRight, Users } from "lucide-react"
import { useMemberJourneyFeed, useMemberJourneyStats } from "@/lib/hooks/use-member-journey"
import { useSendNotification } from "@/lib/hooks/use-notifications"
import { JOURNEY_STAGES } from "@/lib/api/types/member-journey"
import type { JourneyStageId, JourneyActivity } from "@/lib/api/types"

function stageColor(stageId: JourneyStageId): string {
  const colors: Record<JourneyStageId, string> = {
    1: "bg-rose-100 text-rose-700 border-rose-200",
    2: "bg-orange-100 text-orange-700 border-orange-200",
    3: "bg-yellow-100 text-yellow-700 border-yellow-200",
    4: "bg-green-100 text-green-700 border-green-200",
    5: "bg-teal-100 text-teal-700 border-teal-200",
    6: "bg-blue-100 text-blue-700 border-blue-200",
    7: "bg-indigo-100 text-indigo-700 border-indigo-200",
    8: "bg-purple-100 text-purple-700 border-purple-200",
  }
  return colors[stageId]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stageLabel: string
  memberCount: number
}

function NotificationDialog({ open, onOpenChange, stageLabel, memberCount }: NotificationDialogProps) {
  const sendMutation = useSendNotification()
  const [title, setTitle] = useState(`Mensagem para membros em: ${stageLabel}`)
  const [message, setMessage] = useState("")

  const handleSend = async () => {
    if (!title || !message) {
      toast.error("Preencha o título e a mensagem.")
      return
    }
    try {
      await sendMutation.mutateAsync({
        title,
        message,
        channels: ["push"],
        target_audience: "all",
      })
      toast.success("Notificação enviada!")
      onOpenChange(false)
    } catch {
      toast.error("Erro ao enviar notificação.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar mensagem para o grupo</DialogTitle>
          <DialogDescription>
            {memberCount} membro(s) em <strong>{stageLabel}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="notif-title">Título</Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notif-message">Mensagem</Label>
            <Input
              id="notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActivityCard({ activity }: { activity: JourneyActivity }) {
  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="flex items-start gap-4 pt-4 pb-4">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="text-sm font-semibold">
            {getInitials(activity.member_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            <span className="font-semibold">{activity.member_name}</span>
            {" concluiu "}
            <span className="font-semibold">{activity.stage_label}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activity.life_group && (
              <span className="mr-2">{activity.life_group} ·</span>
            )}
            {formatDistanceToNow(new Date(activity.completed_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
          {activity.note && (
            <p className="text-xs text-muted-foreground italic mt-1">
              "{activity.note}"
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={`text-xs shrink-0 ${stageColor(activity.stage_id)}`}
        >
          {activity.stage_label}
        </Badge>
      </CardContent>
    </Card>
  )
}

export function MemberJourneyManagement() {
  const [activeStageFilter, setActiveStageFilter] = useState<JourneyStageId | undefined>()
  const [lifeGroupFilter, setLifeGroupFilter] = useState("")
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")
  const [page, setPage] = useState(1)
  const [notifDialogOpen, setNotifDialogOpen] = useState(false)

  const feedParams = {
    stage_id: activeStageFilter,
    life_group: lifeGroupFilter || undefined,
    from: fromFilter || undefined,
    to: toFilter || undefined,
    page,
    per_page: 20,
  }

  const { data: feed, isLoading: feedLoading } = useMemberJourneyFeed(feedParams)
  const { data: stats = [], isLoading: statsLoading } = useMemberJourneyStats()

  const activeStageInfo = activeStageFilter
    ? JOURNEY_STAGES.find((s) => s.id === activeStageFilter)
    : null
  const activeStageCount = activeStageFilter
    ? (stats.find((s) => s.stage_id === activeStageFilter)?.count ?? 0)
    : 0

  const clearFilters = () => {
    setActiveStageFilter(undefined)
    setLifeGroupFilter("")
    setFromFilter("")
    setToFilter("")
    setPage(1)
  }

  const hasFilters =
    activeStageFilter !== undefined ||
    lifeGroupFilter !== "" ||
    fromFilter !== "" ||
    toFilter !== ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Jornada dos Membros</h1>
        <p className="text-muted-foreground">Acompanhe o caminho disciplinar de cada membro</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))
          : JOURNEY_STAGES.map((stage) => {
              const stat = stats.find((s) => s.stage_id === stage.id)
              const count = stat?.count ?? 0
              const isActive = activeStageFilter === stage.id
              return (
                <button
                  key={stage.id}
                  onClick={() => {
                    setActiveStageFilter(isActive ? undefined : (stage.id as JourneyStageId))
                    setPage(1)
                  }}
                  className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                    isActive
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {stage.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </button>
              )
            })}
      </div>

      {/* Filters bar */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4 pb-4">
          <div className="w-44">
            <Label className="text-xs mb-1 block">Etapa</Label>
            <Select
              value={activeStageFilter ? String(activeStageFilter) : "all"}
              onValueChange={(v) => {
                setActiveStageFilter(v === "all" ? undefined : (Number(v) as JourneyStageId))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {JOURNEY_STAGES.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <Label className="text-xs mb-1 block">Life Group</Label>
            <Input
              className="h-9"
              placeholder="Nome do grupo..."
              value={lifeGroupFilter}
              onChange={(e) => { setLifeGroupFilter(e.target.value); setPage(1) }}
            />
          </div>

          <div className="w-36">
            <Label className="text-xs mb-1 block">De</Label>
            <Input
              className="h-9"
              type="date"
              value={fromFilter}
              onChange={(e) => { setFromFilter(e.target.value); setPage(1) }}
            />
          </div>

          <div className="w-36">
            <Label className="text-xs mb-1 block">Até</Label>
            <Input
              className="h-9"
              type="date"
              value={toFilter}
              onChange={(e) => { setToFilter(e.target.value); setPage(1) }}
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="mr-1.5 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick action banner */}
      {activeStageInfo && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              <strong>{activeStageCount}</strong> membro(s) em{" "}
              <strong>{activeStageInfo.label}</strong>
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNotifDialogOpen(true)}
          >
            <Bell className="mr-1.5 h-3.5 w-3.5" />
            Enviar mensagem para este grupo
          </Button>
        </div>
      )}

      {/* Activity feed */}
      <div className="space-y-3">
        {feedLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : !feed || feed.activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma atividade encontrada.
            </CardContent>
          </Card>
        ) : (
          feed.activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))
        )}

        {feed && feed.activities.length > 0 && feed.activities.length < feed.total && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={feedLoading}
            >
              <ArrowRight className="mr-1.5 h-4 w-4" />
              Carregar mais
            </Button>
          </div>
        )}
      </div>

      {activeStageInfo && (
        <NotificationDialog
          open={notifDialogOpen}
          onOpenChange={setNotifDialogOpen}
          stageLabel={activeStageInfo.label}
          memberCount={activeStageCount}
        />
      )}
    </div>
  )
}
