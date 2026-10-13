'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useReminderRules, useUpdateReminderRule } from '@/lib/hooks/use-reminder-rules'
import type {
  EventReminderConfig,
  FormReminderEntry,
  FormReportReminderConfig,
  LifeGroupAttendanceReminderConfig,
  LifeGroupTasksReminderConfig,
  MemberJourneyReminderConfig,
  MemberJourneyStep,
  ReminderRule,
} from '@/lib/api/types'

// ── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const RULE_TITLES: Record<ReminderRule['type'], string> = {
  form_report: 'Lembretes de Formulário',
  event: 'Lembretes de Evento',
  member_journey: 'Jornada do Membro',
  life_group_attendance: 'Reunião do Life Group',
  life_group_tasks: 'Tarefas do Life Group',
}

const RULE_DESCRIPTIONS: Record<ReminderRule['type'], string> = {
  form_report: 'Notifica líderes sobre formulários pendentes',
  event: 'Notifica membros antes de eventos',
  member_journey: 'Notifica membros parados em etapas',
  life_group_attendance: 'Lembra líderes de lançar a presença e o relatório da reunião',
  life_group_tasks: 'Sorteia e lembra os membros das tarefas do encontro',
}

// Text fields of the life_group_attendance rule. The backend rejects blank
// strings and falls back to its defaults when a key is absent, so blank
// inputs are dropped before saving.
const ATTENDANCE_TEXT_KEYS = [
  'meeting_title',
  'meeting_message',
  'followup_title',
  'followup_message',
  'escalation_title',
  'escalation_message',
] as const

function validateAttendanceConfig(c: LifeGroupAttendanceReminderConfig): string | null {
  const ints: [string, number | undefined, number, number][] = [
    ['Horas após o início', c.hours_after_meeting_start, 0, 23],
    ['Hora do follow-up', c.followup_hour, 0, 23],
    ['Intervalo do follow-up', c.followup_interval_days, 1, 7],
    ['Máximo de dias de follow-up', c.followup_max_days, 0, 14],
    ['Dias até escalar ao líder de setor', c.escalation_after_days, 0, 14],
  ]
  for (const [label, value, min, max] of ints) {
    if (value === undefined) continue
    if (!Number.isInteger(value) || value < min || value > max) {
      return `${label}: informe um número inteiro de ${min} a ${max}`
    }
  }
  return null
}

function cleanAttendanceConfig(c: LifeGroupAttendanceReminderConfig): LifeGroupAttendanceReminderConfig {
  const next = { ...c }
  for (const key of ATTENDANCE_TEXT_KEYS) {
    if (typeof next[key] === 'string' && next[key]!.trim() === '') delete next[key]
  }
  return next
}

const AVAILABLE_ROLES = [
  { value: 'life_group_leader', label: 'Líder de Life Group' },
  { value: 'sector_leader', label: 'Supervisor de Setor' },
  { value: 'area_leader', label: 'Supervisor de Área' },
  { value: 'pastor', label: 'Pastor' },
  { value: 'admin', label: 'Administrador' },
]

const FORM_SLUG_LABELS: Record<string, string> = {
  'life-group-reports': 'Relatório de Life Group',
  'sector-supervisor-reports': 'Relatório de Setor',
  'area-supervisor-reports': 'Relatório de Área',
  'service-reports': 'Relatório do Culto',
}

const DEFAULT_FORM_SLUGS = Object.keys(FORM_SLUG_LABELS)

const EVENT_TITLE_SUGGESTIONS = [
  'Não perca este evento!',
  'Você tem um evento chegando',
  'Lembrete: evento em breve',
  'Prepare-se para o próximo evento',
  'Está chegando um evento especial',
]

const JOURNEY_STEPS: { key: string; label: string; description: string }[] = [
  {
    key: 'registration',
    label: 'Cadastro',
    description: 'Membro ainda não completou o cadastro no app',
  },
  {
    key: 'salvation',
    label: 'Salvação',
    description: 'Membro tomou a decisão de fé mas não avançou',
  },
  {
    key: 'first_courses',
    label: 'Primeiros Cursos',
    description: 'Membro não iniciou ou não concluiu os cursos iniciais',
  },
  {
    key: 'discovery',
    label: 'Evento de Descoberta',
    description: 'Membro não participou do evento de descoberta',
  },
  {
    key: 'life_group',
    label: 'Life Group',
    description: 'Membro não está conectado a um Life Group',
  },
  {
    key: 'water_baptism',
    label: 'Batismo nas Águas',
    description: 'Membro salvo mas ainda não batizado',
  },
  {
    key: 'discipleship',
    label: 'Discipulado',
    description: 'Membro não está em processo de discipulado',
  },
  {
    key: 'disciple_maker',
    label: 'Fazedor de Discípulos',
    description: 'Membro ainda não discipula outros',
  },
]

// ── Root ─────────────────────────────────────────────────────────────────────

export function ReminderSettings() {
  const { data: rules = [], isLoading } = useReminderRules()
  if (isLoading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>
  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <ReminderRow key={rule.id} rule={rule} />
      ))}
    </div>
  )
}

// ── Row card (collapsed summary) ─────────────────────────────────────────────

function ReminderRow({ rule }: { rule: ReminderRule }) {
  const update = useUpdateReminderRule()
  const [enabled, setEnabled] = useState(rule.enabled)
  const [open, setOpen] = useState(false)

  useEffect(() => setEnabled(rule.enabled), [rule.enabled])

  const toggleEnabled = (value: boolean) => {
    setEnabled(value)
    update.mutate(
      { id: rule.id, data: { enabled: value } },
      { onError: () => { setEnabled(!value); toast.error('Falha ao atualizar') } },
    )
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{RULE_TITLES[rule.type]}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{RULE_DESCRIPTIONS[rule.type]}</p>
        </div>
        <Badge variant={enabled ? 'default' : 'secondary'} className="shrink-0">
          {enabled ? 'Ativo' : 'Inativo'}
        </Badge>
        <Switch checked={enabled} onCheckedChange={toggleEnabled} />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Settings2 className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <ReminderSheetContent rule={rule} enabled={enabled} onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  )
}

// ── Sheet content (full config) ───────────────────────────────────────────────

function ReminderSheetContent({
  rule,
  enabled,
  onClose,
}: {
  rule: ReminderRule
  enabled: boolean
  onClose: () => void
}) {
  const update = useUpdateReminderRule()
  const [config, setConfig] = useState(rule.config)

  useEffect(() => setConfig(rule.config), [rule.config])

  const onSave = () => {
    if (rule.type === 'life_group_tasks') {
      const days = (config as LifeGroupTasksReminderConfig).days_before_meeting ?? []
      if (days.length === 0 || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 30)) {
        toast.error('Informe ao menos uma antecedência (0 a 30 dias)')
        return
      }
    }
    let payload = config
    if (rule.type === 'life_group_attendance') {
      const error = validateAttendanceConfig(config as LifeGroupAttendanceReminderConfig)
      if (error) {
        toast.error(error)
        return
      }
      payload = cleanAttendanceConfig(config as LifeGroupAttendanceReminderConfig)
    }
    update.mutate(
      { id: rule.id, data: { config: payload } },
      {
        onSuccess: () => { toast.success('Lembrete atualizado'); onClose() },
        onError: () => toast.error('Falha ao atualizar lembrete'),
      },
    )
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{RULE_TITLES[rule.type]}</SheetTitle>
      </SheetHeader>

      <SheetBody className="space-y-6">
        {rule.type === 'form_report' && (
          <FormReportControls
            config={config as FormReportReminderConfig}
            onChange={setConfig}
            disabled={!enabled}
          />
        )}
        {rule.type === 'event' && (
          <EventControls
            config={config as EventReminderConfig}
            onChange={setConfig}
            disabled={!enabled}
          />
        )}
        {rule.type === 'member_journey' && (
          <MemberJourneyControls
            config={config as MemberJourneyReminderConfig}
            onChange={setConfig}
            disabled={!enabled}
          />
        )}
        {rule.type === 'life_group_attendance' && (
          <LifeGroupAttendanceControls
            config={config as LifeGroupAttendanceReminderConfig}
            onChange={setConfig}
            disabled={!enabled}
          />
        )}
        {rule.type === 'life_group_tasks' && (
          <LifeGroupTasksControls
            config={config as LifeGroupTasksReminderConfig}
            onChange={setConfig}
            disabled={!enabled}
          />
        )}
      </SheetBody>

      <SheetFooter>
        <Button onClick={onSave} disabled={update.isPending} className="w-full">
          Salvar
        </Button>
      </SheetFooter>
    </>
  )
}


// ── Shared: 24h hour picker ───────────────────────────────────────────────────

function HourPicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (h: number) => void
  disabled: boolean
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {HOURS.map((h) => (
          <SelectItem key={h} value={String(h)}>
            {String(h).padStart(2, '0')}:00
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Form report: collapsible entry per form ───────────────────────────────────

function FormReportControls({
  config,
  onChange,
  disabled,
}: {
  config: FormReportReminderConfig
  onChange: (c: FormReportReminderConfig) => void
  disabled: boolean
}) {
  const [openEntries, setOpenEntries] = useState<Record<number, boolean>>({})

  const toggleEntry = (i: number) =>
    setOpenEntries((prev) => ({ ...prev, [i]: !prev[i] }))

  const addEntry = () => {
    const used = new Set(config.forms.map((f) => f.form_slug))
    const next = DEFAULT_FORM_SLUGS.find((s) => !used.has(s)) ?? 'life-group-reports'
    const newIndex = config.forms.length
    onChange({
      forms: [
        ...config.forms,
        { form_slug: next, title: '', message: '', weekday: 0, hour: 20, roles: [] },
      ],
    })
    setOpenEntries((prev) => ({ ...prev, [newIndex]: true }))
  }

  const removeEntry = (index: number) =>
    onChange({ forms: config.forms.filter((_, i) => i !== index) })

  const updateEntry = (index: number, patch: Partial<FormReminderEntry>) =>
    onChange({ forms: config.forms.map((e, i) => (i === index ? { ...e, ...patch } : e)) })

  return (
    <div className="space-y-3">
      {config.forms.map((entry, i) => (
        <Collapsible key={i} open={!!openEntries[i]} onOpenChange={() => toggleEntry(i)}>
          <div className="rounded-lg border overflow-hidden">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                {openEntries[i]
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="flex-1 text-sm font-medium">
                  {FORM_SLUG_LABELS[entry.form_slug] ?? entry.form_slug}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {WEEKDAYS.find((d) => d.value === entry.weekday)?.label}{' '}
                  {String(entry.hour).padStart(2, '0')}:00
                </span>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-4 pb-4 pt-2 space-y-4 border-t">
                <div className="space-y-2">
                  <Label>Formulário</Label>
                  <Select
                    value={entry.form_slug}
                    onValueChange={(v) => updateEntry(i, { form_slug: v })}
                    disabled={disabled}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEFAULT_FORM_SLUGS.map((slug) => (
                        <SelectItem key={slug} value={slug}>{FORM_SLUG_LABELS[slug]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título da notificação</Label>
                  <Input
                    value={entry.title}
                    disabled={disabled}
                    onChange={(e) => updateEntry(i, { title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={entry.message}
                    disabled={disabled}
                    rows={2}
                    onChange={(e) => updateEntry(i, { message: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Dia da semana</Label>
                    <Select
                      value={String(entry.weekday)}
                      onValueChange={(v) => updateEntry(i, { weekday: Number(v) })}
                      disabled={disabled}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((d) => (
                          <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora do envio</Label>
                    <HourPicker
                      value={entry.hour}
                      onChange={(h) => updateEntry(i, { hour: h })}
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Destinatários</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ROLES.map((role) => {
                      const selected = entry.roles.includes(role.value)
                      return (
                        <button
                          key={role.value}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            updateEntry(i, {
                              roles: selected
                                ? entry.roles.filter((r) => r !== role.value)
                                : [...entry.roles, role.value],
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-primary'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {role.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => removeEntry(i)}
                  className="text-destructive hover:text-destructive w-full"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remover formulário
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || config.forms.length >= DEFAULT_FORM_SLUGS.length}
        onClick={addEntry}
        className="w-full"
      >
        <Plus className="h-3 w-3 mr-1" />
        Adicionar formulário
      </Button>
    </div>
  )
}

// ── Event controls ────────────────────────────────────────────────────────────

function EventControls({
  config,
  onChange,
  disabled,
}: {
  config: EventReminderConfig
  onChange: (c: EventReminderConfig) => void
  disabled: boolean
}) {
  const addLead = () =>
    onChange({ ...config, lead_times_hours: [...config.lead_times_hours, 24] })

  const removeLead = (index: number) =>
    onChange({
      ...config,
      lead_times_hours: config.lead_times_hours.filter((_, i) => i !== index),
    })

  const updateLead = (index: number, value: number) =>
    onChange({
      ...config,
      lead_times_hours: config.lead_times_hours.map((h, i) => (i === index ? value : h)),
    })

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Título da notificação</Label>
        <Select
          value={EVENT_TITLE_SUGGESTIONS.includes(config.title ?? '') ? (config.title ?? '') : '__custom__'}
          onValueChange={(v) => { if (v !== '__custom__') onChange({ ...config, title: v }) }}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EVENT_TITLE_SUGGESTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!EVENT_TITLE_SUGGESTIONS.includes(config.title ?? '') && (
          <Input
            value={config.title ?? ''}
            disabled={disabled}
            placeholder="Título personalizado"
            onChange={(e) => onChange({ ...config, title: e.target.value })}
          />
        )}
      </div>

      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        A descrição da notificação será preenchida automaticamente com o título do evento.
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Antecedências de envio</Label>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addLead}>
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        {config.lead_times_hours.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma antecedência configurada.</p>
        )}
        {config.lead_times_hours.map((lead, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <HourPicker
                value={lead > 23 ? 23 : lead}
                onChange={(h) => updateLead(i, h)}
                disabled={disabled}
              />
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">horas antes</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => removeLead(i)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Member journey controls ───────────────────────────────────────────────────

function MemberJourneyControls({
  config,
  onChange,
  disabled,
}: {
  config: MemberJourneyReminderConfig
  onChange: (c: MemberJourneyReminderConfig) => void
  disabled: boolean
}) {
  const usedKeys = new Set(config.steps.map((s) => s.key))
  const availableSteps = JOURNEY_STEPS.filter((s) => !usedKeys.has(s.key))

  const addStep = () => {
    const next = availableSteps[0]
    if (!next) return
    onChange({ ...config, steps: [...config.steps, { key: next.key, days: 15 }] })
  }

  const removeStep = (index: number) =>
    onChange({ ...config, steps: config.steps.filter((_, i) => i !== index) })

  const updateStep = (index: number, patch: Partial<MemberJourneyStep>) =>
    onChange({
      ...config,
      steps: config.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    })

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Título da notificação</Label>
        <Input
          value={config.title ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Textarea
          value={config.message ?? ''}
          disabled={disabled}
          rows={3}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Etapas monitoradas</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || availableSteps.length === 0}
            onClick={addStep}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar etapa
          </Button>
        </div>
        {config.steps.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma etapa configurada.</p>
        )}
        {config.steps.map((step, i) => {
          const meta = JOURNEY_STEPS.find((s) => s.key === step.key)
          const selectableSteps = JOURNEY_STEPS.filter(
            (s) => s.key === step.key || !usedKeys.has(s.key),
          )
          return (
            <div key={i} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Select
                    value={step.key}
                    onValueChange={(v) => updateStep(i, { key: v })}
                    disabled={disabled}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {selectableSteps.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {meta && (
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => removeStep(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs">Notificar após</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-20 h-8 text-sm"
                  value={step.days}
                  disabled={disabled}
                  onChange={(e) => updateStep(i, { days: Number(e.target.value) })}
                />
                <span className="text-xs text-muted-foreground">dias parado nesta etapa</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Life group attendance / meeting controls ─────────────────────────────────

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  disabled: boolean
  onChange: (n: number) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        className="w-28"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function TextFields({
  title,
  message,
  titleLabel,
  messageLabel,
  disabled,
  onTitle,
  onMessage,
}: {
  title: string
  message: string
  titleLabel: string
  messageLabel: string
  disabled: boolean
  onTitle: (v: string) => void
  onMessage: (v: string) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>{titleLabel}</Label>
        <Input
          value={title}
          disabled={disabled}
          placeholder="Usa o texto padrão se ficar em branco"
          onChange={(e) => onTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{messageLabel}</Label>
        <Textarea
          value={message}
          disabled={disabled}
          rows={3}
          placeholder="Usa o texto padrão se ficar em branco"
          onChange={(e) => onMessage(e.target.value)}
        />
      </div>
    </>
  )
}

function LifeGroupAttendanceControls({
  config,
  onChange,
  disabled,
}: {
  config: LifeGroupAttendanceReminderConfig
  onChange: (c: LifeGroupAttendanceReminderConfig) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
        <p>
          Enviado ao líder e ao co-líder de grupos com dia e horário fixos (fuso de São Paulo).
          Grupos &quot;Sem dia fixo&quot; não recebem lembretes.
        </p>
        <p>
          <strong>Atenção:</strong> o texto da reunião (presença + relatório), o follow-up diário e o
          aviso ao líder de setor só são enviados quando a flag do servidor{' '}
          <code>LIFE_GROUP_MEETING_V2</code> está ligada (desligada por padrão, até os apps com a
          tela combinada estarem publicados). Com a flag desligada vale apenas o texto legado
          abaixo.
        </p>
        <p>
          No aviso ao líder de setor use <code>{'{group}'}</code> (nome do grupo) e{' '}
          <code>{'{date}'}</code> (data da reunião, DD/MM).
        </p>
      </div>

      <NumberField
        label="Horas após o início da reunião"
        hint="Quando o primeiro lembrete é enviado (0 a 23)."
        value={config.hours_after_meeting_start ?? 2}
        min={0}
        max={23}
        disabled={disabled}
        onChange={(n) => onChange({ ...config, hours_after_meeting_start: n })}
      />

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Texto legado (flag desligada)</p>
        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={config.title ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Textarea
            value={config.message ?? ''}
            disabled={disabled}
            rows={3}
            onChange={(e) => onChange({ ...config, message: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Primeiro lembrete: presença + relatório (flag ligada)</p>
        <TextFields
          title={config.meeting_title ?? ''}
          message={config.meeting_message ?? ''}
          titleLabel="Título"
          messageLabel="Mensagem"
          disabled={disabled}
          onTitle={(v) => onChange({ ...config, meeting_title: v })}
          onMessage={(v) => onChange({ ...config, meeting_message: v })}
        />
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Follow-up: presença lançada, relatório pendente (flag ligada)</p>
        <div className="space-y-2">
          <Label>Hora do follow-up e do aviso ao líder de setor</Label>
          <HourPicker
            value={config.followup_hour ?? 9}
            onChange={(h) => onChange({ ...config, followup_hour: h })}
            disabled={disabled}
          />
        </div>
        <NumberField
          label="Repetir a cada (dias)"
          hint="1 = todos os dias."
          value={config.followup_interval_days ?? 1}
          min={1}
          max={7}
          disabled={disabled}
          onChange={(n) => onChange({ ...config, followup_interval_days: n })}
        />
        <NumberField
          label="Máximo de dias de follow-up"
          hint="Limite de dias após a reunião (0 desliga o follow-up). Se o aviso ao líder de setor estiver ligado, os follow-ups terminam no dia anterior a ele."
          value={config.followup_max_days ?? 5}
          min={0}
          max={14}
          disabled={disabled}
          onChange={(n) => onChange({ ...config, followup_max_days: n })}
        />
        <TextFields
          title={config.followup_title ?? ''}
          message={config.followup_message ?? ''}
          titleLabel="Título"
          messageLabel="Mensagem"
          disabled={disabled}
          onTitle={(v) => onChange({ ...config, followup_title: v })}
          onMessage={(v) => onChange({ ...config, followup_message: v })}
        />
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Aviso ao líder e co-líder de setor (flag ligada)</p>
        <NumberField
          label="Avisar o setor após (dias)"
          hint="Se ainda não houver relatório X dias após a reunião (0 desliga). Não pode ser silenciado pelo usuário."
          value={config.escalation_after_days ?? 5}
          min={0}
          max={14}
          disabled={disabled}
          onChange={(n) => onChange({ ...config, escalation_after_days: n })}
        />
        <TextFields
          title={config.escalation_title ?? ''}
          message={config.escalation_message ?? ''}
          titleLabel="Título"
          messageLabel="Mensagem"
          disabled={disabled}
          onTitle={(v) => onChange({ ...config, escalation_title: v })}
          onMessage={(v) => onChange({ ...config, escalation_message: v })}
        />
      </div>
    </div>
  )
}

// ── Life group tasks controls ─────────────────────────────────────────────────

function LifeGroupTasksControls({
  config,
  onChange,
  disabled,
}: {
  config: LifeGroupTasksReminderConfig
  onChange: (c: LifeGroupTasksReminderConfig) => void
  disabled: boolean
}) {
  const days = config.days_before_meeting ?? []

  const addDay = () => onChange({ ...config, days_before_meeting: [...days, 1] })

  const removeDay = (index: number) =>
    onChange({ ...config, days_before_meeting: days.filter((_, i) => i !== index) })

  const updateDay = (index: number, value: number) =>
    onChange({
      ...config,
      days_before_meeting: days.map((d, i) => (i === index ? value : d)),
    })

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        A maior antecedência sorteia as tarefas e avisa quem foi escolhido. As demais apenas
        lembram quem já está com uma tarefa. Use <code>{'{task}'}</code> nas mensagens para
        inserir o nome da tarefa.
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Dias antes do encontro</Label>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addDay}>
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        {days.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma antecedência configurada.</p>
        )}
        {days.map((day, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={30}
              className="w-24"
              value={day}
              disabled={disabled}
              onChange={(e) => updateDay(i, Number(e.target.value))}
            />
            <span className="flex-1 text-sm text-muted-foreground">
              dias antes
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => removeDay(i)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Hora do envio</Label>
        <HourPicker
          value={config.hour ?? 9}
          onChange={(h) => onChange({ ...config, hour: h })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Título (aviso de sorteio)</Label>
        <Input
          value={config.title ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Mensagem (aviso de sorteio)</Label>
        <Textarea
          value={config.message ?? ''}
          disabled={disabled}
          rows={3}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Título (lembrete)</Label>
        <Input
          value={config.reminder_title ?? ''}
          disabled={disabled}
          placeholder="Usa o texto padrão se ficar em branco"
          onChange={(e) => onChange({ ...config, reminder_title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Mensagem (lembrete)</Label>
        <Textarea
          value={config.reminder_message ?? ''}
          disabled={disabled}
          rows={3}
          placeholder="Usa o texto padrão se ficar em branco"
          onChange={(e) => onChange({ ...config, reminder_message: e.target.value })}
        />
      </div>
    </div>
  )
}
