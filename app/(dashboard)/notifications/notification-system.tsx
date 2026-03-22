'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Mail, Phone, MessageSquare, Plus, Trash2, Copy, Send, Clock } from 'lucide-react'
import { toast } from 'sonner'
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
]

const CHANNELS = [
  { value: 'push', label: 'Push', sub: 'Android & iOS', icon: Bell },
  { value: 'email', label: 'Email', sub: 'via Resend', icon: Mail },
  { value: 'sms', label: 'SMS', sub: 'via Twilio', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', sub: 'via Meta API', icon: MessageSquare },
] as const

const ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'life_group_leader', label: 'Líder de Célula' },
  { value: 'sector_leader', label: 'Líder de Setor' },
  { value: 'area_leader', label: 'Líder de Área' },
  { value: 'pastor', label: 'Pastor' },
  { value: 'admin', label: 'Admin' },
]

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
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose')
  const [form, setForm] = useState<CreateNotificationRequest>(EMPTY_FORM)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
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

  // Rebuild segment when filters change
  useEffect(() => {
    isDirty.current = true
    if (filters.length === 0) {
      setForm(f => ({ ...f, segment: { type: 'all' } }))
      return
    }
    const built: NotificationSegment = { type: 'filtered', filters: {} }
    filters.forEach(filter => {
      if (!built.filters) built.filters = {}
      if (filter.type === 'role') built.filters.roles = [...(built.filters.roles ?? []), filter.value]
      if (filter.type === 'sector') built.filters.sector_ids = [...(built.filters.sector_ids ?? []), +filter.value]
      if (filter.type === 'life_group') built.filters.life_group_ids = [...(built.filters.life_group_ids ?? []), +filter.value]
      if (filter.type === 'status') built.filters.status = filter.value as 'active' | 'inactive'
    })
    setForm(f => ({ ...f, segment: built }))
  }, [filters])

  // Debounced reach preview
  const fetchReach = useCallback(() => {
    if (form.channels.length === 0) return
    reachMutation.mutate({
      channels: form.channels,
      segment: form.segment,
      category: form.category,
    })
  }, [form.channels, form.segment, form.category, reachMutation.mutate])

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
    setFilters([])
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
    const payload: CreateNotificationRequest = { ...form }
    if (scheduleEnabled && scheduleDate && scheduleTime) {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`)
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'compose' | 'history')}>
        <TabsList>
          <TabsTrigger value="compose">Compor</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* COMPOSE TAB */}
        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">

              {/* Content */}
              <Card>
                <CardHeader><CardTitle>Conteúdo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            isDirty.current = true
                            setForm(f => ({ ...f, category: cat.value }))
                          }}
                          className="focus:outline-none"
                        >
                          <Badge
                            variant={form.category === cat.value ? 'default' : 'outline'}
                            className="cursor-pointer"
                          >
                            {cat.label}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Culto de domingo"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>

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
                </CardContent>
              </Card>

              {/* Channels */}
              <Card>
                <CardHeader><CardTitle>Canais</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {CHANNELS.map(ch => {
                      const Icon = ch.icon
                      const selected = form.channels.includes(ch.value)
                      return (
                        <button
                          key={ch.value}
                          type="button"
                          onClick={() => toggleChannel(ch.value)}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          <div className={`p-2 rounded-md ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{ch.label}</div>
                            <div className="text-xs text-muted-foreground">{ch.sub}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Segment */}
              <Card>
                <CardHeader><CardTitle>Segmento</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {filters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todos os membros ativos</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {filters.map((f, i) => (
                        <Badge key={`${f.type}-${f.value}`} variant="secondary" className="gap-1">
                          {f.type}: {f.value}
                          <button
                            onClick={() => removeFilter(i)}
                            className="ml-1 hover:text-destructive"
                            aria-label={`Remover filtro ${f.type}: ${f.value}`}
                          >×</button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-2">
                    <Select value={newFilterType} onValueChange={setNewFilterType}>
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
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Agendamento</CardTitle>
                    <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                  </div>
                </CardHeader>
                {scheduleEnabled && (
                  <CardContent>
                    <div className="flex gap-3">
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="schedule-date">Data</Label>
                        <Input id="schedule-date" type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="schedule-time">Hora</Label>
                        <Input id="schedule-time" type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Right: Reach Preview + Send */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Alcance Estimado</CardTitle></CardHeader>
                <CardContent>
                  {reachMutation.isPending ? (
                    <p className="text-sm text-muted-foreground">Calculando...</p>
                  ) : reach ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{reach.total}</div>
                        <div className="text-sm text-muted-foreground">membros atingidos</div>
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por canal</p>
                        {Object.entries(reach.by_channel).map(([ch, count]) => (
                          <div key={ch} className="flex justify-between text-sm">
                            <span className="capitalize">{ch}</span>
                            <span className="font-medium">{count}</span>
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
                                <span className="capitalize">{ch}</span>
                                <span>{count}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Selecione canais e segmento</p>
                  )}
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {scheduleEnabled ? <><Clock size={16} className="mr-2" aria-hidden="true" />Agendar</> : <><Send size={16} className="mr-2" aria-hidden="true" />Enviar</>}
              </Button>

              <Button variant="outline" className="w-full" onClick={resetForm}>
                Limpar
              </Button>
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
                            {n.channels.map(ch => (
                              <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>
                            ))}
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
      </Tabs>
    </div>
  )
}
