'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bell,
  Mail,
  Phone,
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  Send,
  Clock,
  ChevronDown,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ReminderSettings } from './reminder-settings'
import {
  useNotifications,
  useCreateNotification,
  useNotificationReach,
  useDeleteNotification,
} from '@/lib/hooks/use-notifications'
import { useQuery } from '@tanstack/react-query'
import { sectorsApi } from '@/lib/api/endpoints/sectors'
import { lifeGroupsApi } from '@/lib/api/endpoints/life-groups'
import type {
  CreateNotificationRequest,
  NotificationCategory,
  NotificationChannel,
  NotificationSegment,
  NotificationStatus,
  Notification,
} from '@/lib/api/types'

const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: 'announcements', label: 'Anúncios' },
  { value: 'events', label: 'Eventos' },
  { value: 'life_group', label: 'Célula' },
  { value: 'academy', label: 'Academia' },
  { value: 'admin_alerts', label: 'Alertas Admin' },
  { value: 'forms', label: 'Formulários' },
  { value: 'member_journey', label: 'Jornada do Membro' },
  { value: 'contributions', label: 'Contribuições' },
  { value: 'meeting_reports', label: 'Relatórios de Reunião' },
]

const LEADER_ONLY_CATEGORIES: NotificationCategory[] = ['forms', 'meeting_reports']

// Only push is available for now — the other channels are not implemented yet.
const CHANNELS = [
  { value: 'push', label: 'Push', icon: Bell, available: true },
  { value: 'email', label: 'Email', icon: Mail, available: false },
  { value: 'sms', label: 'SMS', icon: Phone, available: false },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, available: false },
] as const

const CHANNEL_LABELS: Record<string, string> = {
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
}

const ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'life_group_leader', label: 'Líder de Célula' },
  { value: 'sector_leader', label: 'Líder de Setor' },
  { value: 'area_leader', label: 'Líder de Área' },
  { value: 'pastor', label: 'Pastor' },
  { value: 'admin', label: 'Admin' },
]

const FILTER_TYPE_LABELS: Record<string, string> = {
  role: 'Cargo',
  sector: 'Setor',
  life_group: 'Célula',
  status: 'Status',
}

const STATUS_LABELS: Record<NotificationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  processing: { label: 'Enviando', variant: 'default' },
  scheduled: { label: 'Agendado', variant: 'outline' },
  sent: { label: 'Enviado', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
}

const EMPTY_FORM: CreateNotificationRequest = {
  title: '',
  message: '',
  category: 'announcements',
  channels: ['push'],
  segment: { type: 'all' },
}

export function NotificationSystem() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'automatic'>('compose')
  const [form, setForm] = useState<CreateNotificationRequest>(EMPTY_FORM)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [segmentOpen, setSegmentOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [filters, setFilters] = useState<Array<{ type: string; value: string }>>([])
  const [newFilterType, setNewFilterType] = useState('')
  const [newFilterValue, setNewFilterValue] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const isDirty = useRef(false)

  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications()
  const { data: sectors = [] } = useQuery({ queryKey: ['sectors'], queryFn: () => sectorsApi.getAll() })
  const { data: lifeGroups = [] } = useQuery({ queryKey: ['life-groups'], queryFn: () => lifeGroupsApi.getAll() })

  const createMutation = useCreateNotification()
  const reachMutation = useNotificationReach()
  const deleteMutation = useDeleteNotification()

  // Lock segment to 'filtered' for leader-only categories
  const isLeaderOnlyCategory = LEADER_ONLY_CATEGORIES.includes(form.category)

  // Friendly label for a single filter value
  const filterValueLabel = useCallback(
    (type: string, value: string): string => {
      if (type === 'role') return ROLES.find(r => r.value === value)?.label ?? value
      if (type === 'sector') return sectors.find(s => String(s.id) === value)?.name ?? value
      if (type === 'life_group') return lifeGroups.find(g => String(g.id) === value)?.name ?? value
      if (type === 'status') return value === 'active' ? 'Ativo' : 'Inativo'
      return value
    },
    [sectors, lifeGroups],
  )

  const segmentSummary =
    filters.length === 0
      ? isLeaderOnlyCategory
        ? 'Nenhum filtro'
        : 'Todos os membros ativos'
      : `${filters.length} filtro${filters.length > 1 ? 's' : ''}`

  useEffect(() => {
    if (LEADER_ONLY_CATEGORIES.includes(form.category)) {
      isDirty.current = true
      setSegmentOpen(true)
      setForm(f => ({
        ...f,
        segment: { ...f.segment, type: 'filtered' },
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category])

  // Rebuild segment when filters change
  useEffect(() => {
    isDirty.current = true
    if (filters.length === 0 && !isLeaderOnlyCategory) {
      setForm(f => ({ ...f, segment: { type: 'all' } }))
      return
    }
    if (filters.length === 0) return
    const built: NotificationSegment = { type: 'filtered', filters: {} }
    filters.forEach(filter => {
      if (!built.filters) built.filters = {}
      if (filter.type === 'role') built.filters.roles = [...(built.filters.roles ?? []), filter.value]
      if (filter.type === 'sector') built.filters.sector_ids = [...(built.filters.sector_ids ?? []), +filter.value]
      if (filter.type === 'life_group') built.filters.life_group_ids = [...(built.filters.life_group_ids ?? []), +filter.value]
      if (filter.type === 'status') built.filters.status = filter.value as 'active' | 'inactive'
    })
    setForm(f => ({ ...f, segment: built }))
  }, [filters, isLeaderOnlyCategory])

  // Debounced reach preview
  const fetchReach = useCallback(() => {
    if (form.channels.length === 0) return
    reachMutation.mutate({
      channels: form.channels,
      segment: form.segment,
      category: form.category,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.channels, form.segment, form.category])

  useEffect(() => {
    if (!isDirty.current) return
    const timer = setTimeout(fetchReach, 500)
    return () => clearTimeout(timer)
  }, [fetchReach])

  const toggleChannel = (ch: NotificationChannel) => {
    isDirty.current = true
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter(c => c !== ch)
        : [...f.channels, ch],
    }))
  }

  const addFilter = () => {
    if (!newFilterType || !newFilterValue) return
    setFilters(prev => [...prev, { type: newFilterType, value: newFilterValue }])
    setNewFilterType('')
    setNewFilterValue('')
  }

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setScheduleEnabled(false)
    setScheduleDate('')
    setScheduleTime('')
    setSegmentOpen(false)
    setScheduleOpen(false)
    setFilters([])
  }

  const handleScheduleToggle = (checked: boolean) => {
    setScheduleEnabled(checked)
    if (checked) setScheduleOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title || !form.message) {
      toast.error('Título e mensagem são obrigatórios')
      return
    }
    if (form.channels.length === 0) {
      toast.error('Selecione pelo menos um canal')
      return
    }
    if (LEADER_ONLY_CATEGORIES.includes(form.category) && !filters.some(f => f.type === 'role')) {
      toast.error('Selecione pelo menos um cargo para esta categoria')
      return
    }
    const payload: CreateNotificationRequest = { ...form }
    if (scheduleEnabled) {
      if (!scheduleDate || !scheduleTime) {
        toast.error('Informe a data e a hora do agendamento')
        return
      }
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`)
      if (Number.isNaN(scheduledAt.getTime())) {
        toast.error('Data de agendamento inválida')
        return
      }
      if (scheduledAt <= new Date()) {
        toast.error('A data de agendamento deve ser no futuro')
        return
      }
      payload.scheduled_at = scheduledAt.toISOString()
    } else {
      payload.scheduled_at = null
    }
    try {
      await createMutation.mutateAsync(payload)
      toast.success(scheduleEnabled ? 'Notificação agendada!' : 'Notificação enviada!')
      resetForm()
    } catch {
      toast.error('Erro ao enviar notificação')
    }
  }

  const handleDuplicate = (item: Notification) => {
    setForm({
      title: item.title,
      message: item.message,
      category: item.category,
      channels: item.channels,
      segment: item.segment,
    })
    setScheduleEnabled(false)

    // Rebuild filter pills from the duplicated segment
    const rebuilt: Array<{ type: string; value: string }> = []
    if (item.segment.type === 'filtered' && item.segment.filters) {
      const { roles, sector_ids, life_group_ids, status } = item.segment.filters
      roles?.forEach(r => rebuilt.push({ type: 'role', value: r }))
      sector_ids?.forEach(id => rebuilt.push({ type: 'sector', value: String(id) }))
      life_group_ids?.forEach(id => rebuilt.push({ type: 'life_group', value: String(id) }))
      if (status) rebuilt.push({ type: 'status', value: status })
    }
    setFilters(rebuilt)
    setSegmentOpen(rebuilt.length > 0)

    setActiveTab('compose')
    toast.info('Notificação duplicada para edição')
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Notificação removida')
    } catch {
      toast.error('Erro ao remover notificação')
    } finally {
      setDeletingId(null)
    }
  }

  const reach = reachMutation.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notificações</h1>
        <p className="text-muted-foreground">Envie notificações segmentadas para membros</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'compose' | 'history' | 'automatic')}>
        <TabsList>
          <TabsTrigger value="compose">Criar</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="automatic">Automáticos</TabsTrigger>
        </TabsList>

        {/* CREATE TAB */}
        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: single composition card */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Conteúdo</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* Category dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => {
                      isDirty.current = true
                      setForm(f => ({ ...f, category: v as NotificationCategory }))
                    }}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Culto de domingo"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Escreva a mensagem..."
                    rows={4}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  />
                </div>

                {/* Channels — inline, single line, no technical info */}
                <div className="space-y-2">
                  <Label>Canais</Label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map(ch => {
                      const Icon = ch.icon
                      const selected = form.channels.includes(ch.value)
                      return (
                        <Button
                          key={ch.value}
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          size="sm"
                          disabled={!ch.available}
                          onClick={() => ch.available && toggleChannel(ch.value)}
                          className="gap-2"
                          title={ch.available ? undefined : 'Em breve'}
                        >
                          <Icon size={16} />
                          {ch.label}
                          {!ch.available && (
                            <span className="text-[10px] text-muted-foreground">em breve</span>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Segment — collapsible */}
                <Collapsible open={segmentOpen} onOpenChange={setSegmentOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md py-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Segmento</span>
                      {isLeaderOnlyCategory && (
                        <Badge variant="outline" className="text-xs">Somente líderes</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{segmentSummary}</span>
                      <ChevronDown size={16} className={cn('transition-transform', segmentOpen && 'rotate-180')} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    {isLeaderOnlyCategory && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Esta categoria requer filtro por cargo. Adicione pelo menos um cargo abaixo.
                      </p>
                    )}
                    {filters.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {isLeaderOnlyCategory ? 'Nenhum filtro adicionado' : 'Todos os membros ativos'}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {filters.map((f, i) => (
                          <Badge key={`${f.type}-${f.value}`} variant="secondary" className="gap-1">
                            {FILTER_TYPE_LABELS[f.type] ?? f.type}: {filterValueLabel(f.type, f.value)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFilter(i)}
                              className="ml-1 h-auto p-0 hover:text-destructive"
                              aria-label={`Remover filtro ${FILTER_TYPE_LABELS[f.type] ?? f.type}: ${filterValueLabel(f.type, f.value)}`}
                            >×</Button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Select value={newFilterType} onValueChange={(v) => { setNewFilterType(v); setNewFilterValue('') }}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Filtro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="role">Cargo</SelectItem>
                          <SelectItem value="sector">Setor</SelectItem>
                          <SelectItem value="life_group">Célula</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>

                      {newFilterType === 'role' && (
                        <Select value={newFilterValue} onValueChange={setNewFilterValue}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {newFilterType === 'sector' && (
                        <Select value={newFilterValue} onValueChange={setNewFilterValue}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Setor" />
                          </SelectTrigger>
                          <SelectContent>
                            {sectors.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {newFilterType === 'life_group' && (
                        <Select value={newFilterValue} onValueChange={setNewFilterValue}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Célula" />
                          </SelectTrigger>
                          <SelectContent>
                            {lifeGroups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {newFilterType === 'status' && (
                        <Select value={newFilterValue} onValueChange={setNewFilterValue}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      <Button type="button" variant="outline" size="icon" onClick={addFilter} disabled={!newFilterType || !newFilterValue}>
                        <Plus size={16} />
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* Schedule — collapsible */}
                <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md py-1 text-left">
                    <span className="font-medium">Agendamento</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{scheduleEnabled ? 'Programado' : 'Enviar agora'}</span>
                      <ChevronDown size={16} className={cn('transition-transform', scheduleOpen && 'rotate-180')} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="schedule-switch" className="text-sm font-normal text-muted-foreground">
                        Agendar para enviar depois
                      </Label>
                      <Switch
                        id="schedule-switch"
                        checked={scheduleEnabled}
                        onCheckedChange={handleScheduleToggle}
                      />
                    </div>
                    {scheduleEnabled && (
                      <div className="flex gap-3">
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="schedule-date">Data</Label>
                          <Input
                            id="schedule-date"
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={scheduleDate}
                            onChange={e => setScheduleDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="schedule-time">Hora</Label>
                          <Input id="schedule-time" type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Right: highlighted reach + final actions */}
            <div className="lg:sticky lg:top-6">
              <Card className="border-primary/60 shadow-md ring-1 ring-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users size={18} className="text-primary" />
                      Alcance Estimado
                    </CardTitle>
                    <Badge variant="outline" className="border-primary/40 text-primary">Última etapa</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reachMutation.isPending ? (
                    <p className="text-sm text-muted-foreground">Calculando...</p>
                  ) : reach ? (
                    <div className="space-y-3">
                      <div className="text-center rounded-lg bg-primary/5 py-4">
                        <div className="text-4xl font-bold text-primary">{reach.total}</div>
                        <div className="text-sm text-muted-foreground">membros atingidos</div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por canal</p>
                        {form.channels.map((ch) => (
                          <div key={ch} className="flex justify-between text-sm">
                            <span>{CHANNEL_LABELS[ch] ?? ch}</span>
                            <span className="font-medium">{reach.by_channel[ch] ?? 0}</span>
                          </div>
                        ))}
                      </div>
                      {Object.values(reach.excluded).some(v => v > 0) && (
                        <>
                          <Separator />
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Excluídos por preferência</p>
                            {Object.entries(reach.excluded).filter(([, v]) => v > 0).map(([ch, count]) => (
                              <div key={ch} className="flex justify-between text-sm text-muted-foreground">
                                <span>{CHANNEL_LABELS[ch] ?? ch}</span>
                                <span>{count}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Preencha o conteúdo para ver o alcance</p>
                  )}

                  <Separator />

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                  >
                    {scheduleEnabled
                      ? <><Clock size={16} className="mr-2" aria-hidden="true" />Agendar</>
                      : <><Send size={16} className="mr-2" aria-hidden="true" />Enviar</>}
                  </Button>

                  <Button variant="outline" className="w-full" onClick={resetForm}>
                    Limpar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              {notificationsLoading ? (
                <p className="text-center text-muted-foreground">Carregando...</p>
              ) : notifications.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhuma notificação encontrada</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => {
                    const statusInfo = STATUS_LABELS[n.status] ?? { label: n.status, variant: 'secondary' as const }
                    return (
                      <div key={n.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{n.title}</span>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            <Badge variant="outline">{CATEGORIES.find(c => c.value === n.category)?.label ?? n.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                          <div className="flex gap-2 flex-wrap">
                            {n.channels.map(ch => {
                              const delivered = n.recipients_by_channel?.[ch]
                              return (
                                <Badge key={ch} variant="secondary" className="text-xs">
                                  {CHANNEL_LABELS[ch] ?? ch}
                                  {delivered !== undefined && (
                                    <span className="ml-1 opacity-70">· {delivered}</span>
                                  )}
                                </Badge>
                              )
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {n.recipients_count} destinatários · {new Date(n.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(n)} title="Duplicar">
                            <Copy size={16} />
                          </Button>
                          {(n.status === 'pending' || n.status === 'scheduled') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(n.id)}
                              disabled={deletingId === n.id}
                              title="Remover"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTOMATIC TAB */}
        <TabsContent value="automatic">
          <ReminderSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
