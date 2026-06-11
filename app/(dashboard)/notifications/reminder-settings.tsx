'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReminderRules, useUpdateReminderRule } from '@/lib/hooks/use-reminder-rules'
import type {
  ReminderRule,
  FormReportReminderConfig,
  EventReminderConfig,
  MemberJourneyReminderConfig,
} from '@/lib/api/types'

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

const RULE_TITLES: Record<ReminderRule['type'], string> = {
  form_report: 'Lembretes de Formulário',
  event: 'Lembretes de Evento',
  member_journey: 'Jornada do Membro',
}

export function ReminderSettings() {
  const { data: rules = [], isLoading } = useReminderRules()
  if (isLoading) return <p className="text-center text-muted-foreground">Carregando...</p>
  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <ReminderCard key={rule.id} rule={rule} />
      ))}
    </div>
  )
}

function ReminderCard({ rule }: { rule: ReminderRule }) {
  const update = useUpdateReminderRule()
  const [enabled, setEnabled] = useState(rule.enabled)
  const [config, setConfig] = useState(rule.config)

  useEffect(() => {
    setEnabled(rule.enabled)
    setConfig(rule.config)
  }, [rule])

  const onSave = () => {
    update.mutate(
      { id: rule.id, data: { enabled, config } },
      {
        onSuccess: () => toast.success('Lembrete atualizado'),
        onError: () => toast.error('Falha ao atualizar lembrete'),
      },
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{RULE_TITLES[rule.type]}</CardTitle>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </CardHeader>
      <CardContent className="space-y-4">
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
        <Button onClick={onSave} disabled={update.isPending}>
          Salvar
        </Button>
      </CardContent>
    </Card>
  )
}

function FormReportControls({
  config,
  onChange,
  disabled,
}: {
  config: FormReportReminderConfig
  onChange: (c: FormReportReminderConfig) => void
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Dia da semana</Label>
        <Select
          value={String(config.weekday)}
          onValueChange={(v) => onChange({ ...config, weekday: Number(v) })}
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
        <Label>Hora (0–23)</Label>
        <Input
          type="number"
          min={0}
          max={23}
          value={config.hour}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, hour: Number(e.target.value) })}
        />
      </div>
    </div>
  )
}

function EventControls({
  config,
  onChange,
  disabled,
}: {
  config: EventReminderConfig
  onChange: (c: EventReminderConfig) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>Antecedências (horas, separadas por vírgula)</Label>
      <Input
        value={config.lead_times_hours.join(', ')}
        disabled={disabled}
        onChange={(e) =>
          onChange({
            ...config,
            lead_times_hours: e.target.value
              .split(',')
              .map((s) => Number(s.trim()))
              .filter((n) => !Number.isNaN(n) && n > 0),
          })
        }
      />
    </div>
  )
}

function MemberJourneyControls({
  config,
  onChange,
  disabled,
}: {
  config: MemberJourneyReminderConfig
  onChange: (c: MemberJourneyReminderConfig) => void
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Dias parado</Label>
        <Input
          type="number"
          min={1}
          value={config.threshold_days}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, threshold_days: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label>Etapas (chaves, separadas por vírgula)</Label>
        <Input
          value={config.steps.join(', ')}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...config,
              steps: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
        />
      </div>
    </div>
  )
}
