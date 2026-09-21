"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateCasaDePazSubmission } from "@/lib/hooks/use-casa-de-paz-analytics"
import { useSectors } from "@/lib/hooks/use-sectors"
import type { CasaDePazReportSubmission, UpdateCasaDePazReportRequest } from "@/lib/api/types"

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

export function CasaDePazEditDialog({ submission, onOpenChange }: CasaDePazEditDialogProps) {
  const { data: sectors = [] } = useSectors()
  const updateMutation = useUpdateCasaDePazSubmission()
  const [form, setForm] = useState<UpdateCasaDePazReportRequest>({})

  useEffect(() => {
    if (submission) {
      setForm({
        date: submission.date,
        facilitator: submission.facilitator,
        sector_id: submission.sector_id,
        adults: submission.adults,
        kids: submission.kids,
        guests: submission.guests,
        conversions: submission.conversions,
        meeting_day: submission.meeting_day ?? undefined,
      })
    }
  }, [submission])

  const handleSave = async () => {
    if (!submission) return
    try {
      await updateMutation.mutateAsync({ id: submission.id, data: form })
      toast.success("Registro atualizado")
      onOpenChange(false)
    } catch {
      toast.error("Erro ao atualizar registro")
    }
  }

  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
            <Label htmlFor="cdp-adults">Adultos</Label>
            <Input
              id="cdp-adults"
              type="number"
              min={0}
              value={form.adults ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, adults: Number(e.target.value) }))}
            />
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
            <Label htmlFor="cdp-guests">Convidados</Label>
            <Input
              id="cdp-guests"
              type="number"
              min={0}
              value={form.guests ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, guests: Number(e.target.value) }))}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
