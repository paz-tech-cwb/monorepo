"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import { useCasaDePazSubmissions } from "@/lib/hooks/use-casa-de-paz-analytics"
import { useSectors } from "@/lib/hooks/use-sectors"
import type { CasaDePazFilterState } from "./casa-de-paz-analytics-filters"

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

  const sectorMap = useMemo(() => new Map(sectors.map((s) => [s.id, s.name])), [sectors])

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
              <TableHead>Horário</TableHead>
              <TableHead>Adultos</TableHead>
              <TableHead>Crianças</TableHead>
              <TableHead>Convidados</TableHead>
              <TableHead>Conversões</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{formatDate(s.date)}</TableCell>
                <TableCell>{s.facilitator}</TableCell>
                <TableCell>{sectorMap.get(s.sector_id) ?? "Setor removido"}</TableCell>
                <TableCell>{s.meeting_day ?? "—"}</TableCell>
                <TableCell>{s.meeting_time ?? "—"}</TableCell>
                <TableCell>{s.adults}</TableCell>
                <TableCell>{s.kids}</TableCell>
                <TableCell>{s.guests}</TableCell>
                <TableCell>{s.conversions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
