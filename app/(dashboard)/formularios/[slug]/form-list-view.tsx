"use client"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import type { FormSlug, FormSubmissionFilters } from "@/lib/api/types/formularios"
import { useFormsCatalog } from "@/lib/hooks/use-forms-catalog"
import { useFormSubmissions } from "@/lib/hooks/use-form-submissions"
import { SubmissionFilters } from "../_components/submission-filters"
import { COLUMNS } from "./_columns"
import { CoursesManager } from "./courses-manager"

export function FormListView({ slug }: { slug: FormSlug }) {
  const router = useRouter()
  const { data: catalog = [] } = useFormsCatalog()
  const meta = catalog.find((f) => f.slug === slug)
  const [filters, setFilters] = useState<FormSubmissionFilters>({})
  const { data: rows = [], isLoading } = useFormSubmissions<
    Record<string, unknown> & { id: string }
  >(slug, filters)
  const cols = COLUMNS[slug] ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{meta?.name ?? slug}</h1>
          <p className="text-muted-foreground text-sm">{meta?.description}</p>
        </div>
        {meta?.can_write && (
          <Button asChild>
            <Link href={`/formularios/${slug}/new`}>
              <Plus className="size-4 mr-1" /> Novo registro
            </Link>
          </Button>
        )}
      </div>

      {slug === "member-registrations" && <CoursesManager />}

      <Card>
        <SubmissionFilters value={filters} onChange={setFilters} />
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={cols.length + 1}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/formularios/${slug}/${r.id}`)}
                >
                  {cols.map((c) => (
                    <TableCell key={c.key}>
                      {c.format ? c.format(r[c.key], r) : String(r[c.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-xs text-muted-foreground">
                    Ver →
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
