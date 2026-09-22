"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import { Button } from "@/components/ui/button"
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
import { useCasaDePazSubmissions, useDeleteCasaDePazSubmission } from "@/lib/hooks/use-casa-de-paz-analytics"
import { useSectors } from "@/lib/hooks/use-sectors"
import { CasaDePazEditDialog } from "./casa-de-paz-edit-dialog"
import type { CasaDePazFilterState } from "./casa-de-paz-analytics-filters"
import type { CasaDePazReportSubmission } from "@/lib/api/types"

const COLUMN_COUNT = 9

function formatDate(value: string): string {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

interface CasaDePazTableProps {
  filters: CasaDePazFilterState
  /** Same exact "YYYY-MM-DD" range the summary endpoint resolved for these
   * filters — reused here instead of re-deriving the window logic
   * client-side, since the raw submissions endpoint has no server-side
   * date filtering. ISO date strings compare correctly lexicographically. */
  range?: { from: string; to: string }
}

export function CasaDePazTable({ filters, range }: CasaDePazTableProps) {
  const { data: submissions = [], isLoading, isError } = useCasaDePazSubmissions()
  const { data: sectors = [] } = useSectors()
  const deleteMutation = useDeleteCasaDePazSubmission()

  const [editing, setEditing] = useState<CasaDePazReportSubmission | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sectorMap = useMemo(() => new Map(sectors.map((s) => [s.id, s.name])), [sectors])

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteMutation.mutateAsync(deletingId)
      toast.success("Registro removido")
    } catch {
      toast.error("Erro ao remover registro")
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    if (!range) return submissions
    return submissions
      .filter((s) => s.date >= range.from && s.date <= range.to)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [submissions, range])

  return (
    <Card>
      {isLoading ? (
        <div className="p-4">
          <TableSkeleton rows={6} columns={COLUMN_COUNT} />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive py-8 text-center">
          Não foi possível carregar os registros de Casa de Paz.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum registro de Casa de Paz encontrado entre {filters.from} e {filters.to}.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Facilitador</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Adultos</TableHead>
              <TableHead>Crianças</TableHead>
              <TableHead>Convidados</TableHead>
              <TableHead>Conversões</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{formatDate(s.date)}</TableCell>
                <TableCell>{s.facilitator}</TableCell>
                <TableCell>{sectorMap.get(s.sector_id) ?? "Setor removido"}</TableCell>
                <TableCell>{s.meeting_day ?? "—"}</TableCell>
                <TableCell>{s.adults}</TableCell>
                <TableCell>{s.kids}</TableCell>
                <TableCell>{s.guests}</TableCell>
                <TableCell>{s.conversions}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(s)} title="Editar">
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingId(s.id)}
                      title="Remover"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CasaDePazEditDialog submission={editing} onOpenChange={(open) => !open && setEditing(null)} />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover registro de Casa de Paz?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
