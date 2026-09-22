"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateCasaDePazSubmission } from "@/lib/hooks/use-casa-de-paz-analytics"
import { useSectors } from "@/lib/hooks/use-sectors"
import { useCasaDePazCycles } from "@/lib/hooks/use-casa-de-paz-cycles"
import type {
  CasaDePazReportGuestInput,
  CasaDePazReportSubmission,
  UpdateCasaDePazReportRequest,
} from "@/lib/api/types"

// Mirrors backend's CASA_DE_PAZ_MEETING_DAYS (create-casa-de-paz-report.dto.ts)
const MEETING_DAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const

interface CasaDePazEditDialogProps {
  submission: CasaDePazReportSubmission | null
  onOpenChange: (open: boolean) => void
}

function emptyGuest(): CasaDePazReportGuestInput {
  return { name: "", email: "", birth_date: "", whatsapp: "" }
}

function isGuestValid(g: CasaDePazReportGuestInput): boolean {
  return g.name.trim().length > 0 && /\S+@\S+\.\S+/.test(g.email) && !!g.birth_date
}

export function CasaDePazEditDialog({ submission, onOpenChange }: CasaDePazEditDialogProps) {
  const { data: sectors = [] } = useSectors()
  const { data: cycles = [] } = useCasaDePazCycles()
  const updateMutation = useUpdateCasaDePazSubmission()
  const [form, setForm] = useState<UpdateCasaDePazReportRequest>({})
  const [guests, setGuests] = useState<CasaDePazReportGuestInput[]>([])

  const mostRecentCycleId = useMemo(() => {
    if (cycles.length === 0) return undefined
    const open = cycles.find((c) => c.status === "open")
    return (open ?? cycles[0]).id
  }, [cycles])

  useEffect(() => {
    if (submission) {
      setForm({
        date: submission.date,
        facilitator: submission.facilitator,
        sector_id: submission.sector_id,
        casa_de_paz_id: submission.casa_de_paz_id,
        kids: submission.kids,
        conversions: submission.conversions,
        meeting_day: submission.meeting_day ?? undefined,
      })
      setGuests(
        submission.guests.length > 0
          ? submission.guests.map((g) => ({
              name: g.name,
              email: g.email,
              birth_date: g.birth_date,
              whatsapp: g.whatsapp ?? "",
            }))
          : []
      )
    } else {
      setForm((f) => ({ ...f, casa_de_paz_id: mostRecentCycleId }))
      setGuests([])
    }
  }, [submission, mostRecentCycleId])

  const guestsValid = guests.every(isGuestValid)
  const canSave = !!form.casa_de_paz_id && guestsValid

  const updateGuest = (index: number, patch: Partial<CasaDePazReportGuestInput>) => {
    setGuests((list) => list.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  const removeGuest = (index: number) => {
    setGuests((list) => list.filter((_, i) => i !== index))
  }

  const addGuest = () => {
    setGuests((list) => [...list, emptyGuest()])
  }

  const handleSave = async () => {
    if (!submission || !canSave) return
    try {
      await updateMutation.mutateAsync({
        id: submission.id,
        data: {
          ...form,
          guests: guests.map((g) => ({
            name: g.name.trim(),
            email: g.email.trim(),
            birth_date: g.birth_date,
            whatsapp: g.whatsapp?.trim() || undefined,
          })),
        },
      })
      toast.success("Registro atualizado")
      onOpenChange(false)
    } catch {
      toast.error("Erro ao atualizar registro")
    }
  }

  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar registro de Casa de Paz</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cdp-date">Data</Label>
            <Input
              id="cdp-date"
              type="date"
              value={form.date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cdp-facilitator">Facilitador</Label>
            <Input
              id="cdp-facilitator"
              value={form.facilitator ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, facilitator: e.target.value }))}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="cdp-sector">Setor</Label>
            <Select
              value={form.sector_id ? String(form.sector_id) : ""}
              onValueChange={(v) => setForm((f) => ({ ...f, sector_id: Number(v) }))}
            >
              <SelectTrigger id="cdp-sector" className="w-full">
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="cdp-cycle">Ciclo</Label>
            <Select
              value={form.casa_de_paz_id ?? ""}
              onValueChange={(v) => setForm((f) => ({ ...f, casa_de_paz_id: v }))}
            >
              <SelectTrigger id="cdp-cycle" className="w-full">
                <SelectValue placeholder="Selecione o ciclo" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cdp-day">Dia da reunião</Label>
            <Select
              value={form.meeting_day ?? ""}
              onValueChange={(v) => setForm((f) => ({ ...f, meeting_day: v }))}
            >
              <SelectTrigger id="cdp-day" className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {MEETING_DAYS.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cdp-kids">Crianças</Label>
            <Input
              id="cdp-kids"
              type="number"
              min={0}
              value={form.kids ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, kids: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cdp-conversions">Conversões</Label>
            <Input
              id="cdp-conversions"
              type="number"
              min={0}
              value={form.conversions ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, conversions: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Convidados</Label>
            <Button type="button" variant="outline" size="sm" onClick={addGuest}>
              <Plus className="size-4 mr-1" /> Adicionar convidado
            </Button>
          </div>

          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convidado adicionado.</p>
          ) : (
            <div className="space-y-3">
              {guests.map((guest, index) => {
                const invalid = !isGuestValid(guest)
                return (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start border rounded-md p-3">
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        value={guest.name}
                        onChange={(e) => updateGuest(index, { name: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input
                        type="email"
                        value={guest.email}
                        onChange={(e) => updateGuest(index, { email: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Data de nascimento</Label>
                      <Input
                        type="date"
                        value={guest.birth_date}
                        onChange={(e) => updateGuest(index, { birth_date: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input
                        value={guest.whatsapp ?? ""}
                        onChange={(e) => updateGuest(index, { whatsapp: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1 flex items-end justify-end h-full pt-5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGuest(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                    {invalid && (
                      <p className="col-span-12 text-xs text-destructive">
                        Nome, e-mail e data de nascimento são obrigatórios.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
